#  L3 Switch Configuration - Implementation Guide

This document describes how the NetworkSim simulator implements proper  Layer 3 switch behavior according to  networking standards.

## Overview

The simulator now enforces 5 key  networking concepts:

1. **Routed Port Configuration (no switchport)**
2. **IP Routing Enablement (ip routing)**
3. **SVI Status Requirements**
4. **Memory Configuration (sdm prefer)**
5. **L2 vs L3 IP Address Distinction**

---

## 1. Routed Port Configuration (no switchport)

### Concept
Physical ports on a  Layer 3 switch default to Layer 2 (switchport) mode. To use a physical port for Layer 3 routing, you must first disable the switching feature with `no switchport`.

###  Standards
- Physical ports are **Layer 2 by default**
- `no switchport` command **only available on L3 switches**
- Cannot be used on VLAN interfaces or wireless interfaces
- Converts port from switchport mode to routed mode
- Layer 2 specific settings (VLAN, trunk) are cleared

### Implementation in NetworkSim

**Command**: `no switchport`

**Location**: [interfaceCommands.ts](src/lib/network/core/interfaceCommands.ts) - `cmdNoSwitchport()`

**Validation**:
- ✅ Checks device is L3 switch (not L2)
- ✅ Rejects command if issued on VLAN interface
- ✅ Rejects command if issued on WLAN interface
- ✅ Clears L2-specific settings: accessVlan, nativeVlan, allowedVlans, portSecurity, spanningTree
- ✅ Sets port to 'routed' mode

**Example**:
```
Switch(config)# interface Gi0/1
Switch(config-if)# no switchport
Interface Gi0/1 converted to routed port
Port(s) are now in L3 routed mode. Use 'ip address' to assign an IP address.
```

**Error Cases**:
```
% Invalid command. Layer 2 switch (WS-C2960-24TT-L) does not support routed ports.
'no switchport' is only available on Layer 3 switches.

% Invalid command on VLAN interface

% Invalid command on WLAN interface
```

---

## 2. IP Routing Enablement (ip routing)

### Concept
For an L3 switch to route packets between VLANs, the `ip routing` command must be enabled in global configuration mode. Without this command, the device operates as a Layer 2 switch only.

###  Standards
- **Mandatory** for inter-VLAN routing on L3 switches
- **Global configuration mode** only
- Activates the Routing Information Base (RIB)
- Creates default routing table
- Must be enabled **before** routing can function

### Implementation in NetworkSim

**Command**: `ip routing`

**Location**: [globalConfigCommands.ts](src/lib/network/core/globalConfigCommands.ts) - `cmdIpRouting()`

**Validation**:
- ✅ Checks command issued in config mode
- ✅ Validates device is L3 switch or router
- ✅ Checks for sdm prefer prerequisites
- ✅ Requires reload if sdm prefer was configured

**Example**:
```
Switch(config)# ip routing
IP routing enabled
```

**With SDM Prefer Prerequisites**:
```
Switch(config)# sdm prefer lanbase-routing
Changes to the SDM preferences will take effect after reload.
...
% System needs to be reloaded for the new template to take effect.
% Use 'reload' command to reboot the device.

Switch(config)# ip routing
% SDM preference has been changed.
Device must be reloaded before activating 'ip routing'.
Use command: reload
```

**Error Cases**:
```
% Invalid command. Layer 2 switch (WS-C2960-24TT-L) does not support IP routing.
IP routing is only supported on routers and Layer 3 switches.
```

---

## 3. SVI (VLAN Interface) Status Requirements

### Concept
A Switched Virtual Interface (SVI) - created with `interface vlan X` - becomes "up/up" only if:
1. The VLAN exists
2. At least one physical port is assigned to that VLAN
3. At least one of those ports is active (not shutdown)

###  Standards
- SVI requires **at least one active port** in the VLAN
- If all ports in VLAN are shutdown, SVI goes down
- SVI status affects gateway functionality
- Cannot route traffic through a down SVI
- Management traffic uses the SVI IP when available

### Implementation in NetworkSim

**Validation Function**: [L3Validation.ts](src/lib/network/core/L3Validation.ts) - `validateSviStatus()`

**Used By**: `ip address` command on VLAN interfaces

**Status Indicators**:
- `up` - VLAN exists with active ports
- `down` - VLAN has no ports or all ports shutdown
- `notaccessible` - VLAN doesn't exist

**Example Output**:
```
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Interface Vlan10 configured with IP 192.168.10.1 255.255.255.0
Vlan10 will be up (Active ports: fa0/1, fa0/2, fa0/3)

Switch(config)# interface fa0/1
Switch(config-if)# shutdown

Switch(config)# interface vlan 10
Vlan10 status: down (no active ports assigned)
% Warning: VLAN 10 has no active ports assigned.
% SVI will be down until at least one port in this VLAN is configured and active.
```

**Validation Logic**:
```typescript
// Check all physical ports in state.ports
for each port:
  if port.type === 'vlan': skip
  if port assigned to VLAN 10:
    if port NOT shutdown AND port.status !== 'disabled' AND port.status !== 'err-disabled':
      activePorts.push(port)

if activePorts.length === 0:
  return { status: 'down', error: 'No active ports in VLAN' }
else:
  return { status: 'up', activePorts: [...] }
```

---

## 4. Memory Configuration (sdm prefer)

### Concept
On some  switches, the memory must be configured for the routing table before enabling IP routing. The `sdm prefer lanbase-routing` command allocates TCAM memory for routing.

###  Standards
- Only on specific L3 switch models
- **Requires reload** to take effect
- Cannot enable `ip routing` until reload completes
- Different templates allocate different amounts of routing table space
- Templates: `lanbase-routing`, `lanbase`, `desktop`, `default`

### Implementation in NetworkSim

**Command**: `sdm prefer <template>`

**Location**: [globalConfigCommands.ts](src/lib/network/core/globalConfigCommands.ts) - `cmdSdmPrefer()`

**Validation**:
- ✅ Validates template name
- ✅ Only allowed on L3 switches
- ✅ Shows memory allocation details
- ✅ Marks device for reload
- ✅ `ip routing` command checks for reload flag

**Templates Supported**:
- `lanbase-routing` - Optimal for inter-VLAN routing (16384 IPv4 ACL entries)
- `lanbase` - Standard L3 switching (8192 IPv4 ACL entries)
- `desktop` - Limited routing (4096 IPv4 ACL entries)
- `default` - Current template
- `routing` - Alias for lanbase-routing

**Example Workflow**:
```
Switch(config)# sdm prefer lanbase-routing
Changes to the SDM preferences will take effect after reload.
This template will configure: 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries

% System needs to be reloaded for the new template to take effect.
% Use 'reload' command to reboot the device.

Switch(config)# reload

--- Device reloads ---

Switch(config)# ip routing
IP routing enabled
SDM preference configuration is active. Routing table has been allocated.
```

---

## 5. L2 vs L3 IP Address Distinction

### Concept
The purpose of an IP address differs based on the device type:

**L2 Switch**:
- IP address is for **management only** (SSH/Telnet access)
- **Cannot** route traffic between VLANs
- IP must be configured on a VLAN interface (SVI)
- Traffic between VLANs is impossible

**L3 Switch**:
- IP address serves **dual purpose**: management AND routing gateway
- Each VLAN interface can route traffic between VLANs
- Physical routed ports can also have IP addresses for routing
- Full inter-VLAN routing capability

### Implementation in NetworkSim

**Validation Function**: [L3Validation.ts](src/lib/network/core/L3Validation.ts) - `getIpAddressPurpose()`

**Used By**: `ip address` command

**Example Outputs**:

**L2 Switch - VLAN Interface**:
```
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Interface Vlan10 configured with IP 192.168.10.1 255.255.255.0

% Note: This is a Layer 2 switch. IP address is for device management only (SSH/Telnet).
% Traffic between VLANs cannot be routed.
```

**L3 Switch - VLAN Interface**:
```
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Interface Vlan10 configured with IP 192.168.10.1 255.255.255.0

% Note: This IP will be used for both device management and VLAN 10 routing gateway.
```

**L3 Switch - Routed Port**:
```
Switch(config)# interface gi0/1
Switch(config-if)# no switchport
Interface Gi0/1 converted to routed port
Switch(config-if)# ip address 10.0.0.1 255.255.255.0
Interface Gi0/1 configured with IP 10.0.0.1 255.255.255.0

% Note: Routed port on L3 switch: used for inter-VLAN routing
```

---

## Validation Helper Functions

All validations are provided in [L3Validation.ts](src/lib/network/core/L3Validation.ts):

### Public Functions

```typescript
// Validates no switchport support
validateNoSwitchportSupport(switchModel): { valid, error? }

// Validates ip routing support with prerequisites
validateIpRoutingSupport(switchModel, currentState): { valid, error?, requiresReload? }

// Validates SVI status with active port count
validateSviStatus(state, vlanId): { valid, status, activePorts, error? }

// Validates ip routing is enabled
validateIpRoutingEnabled(state): { valid, error? }

// Determines IP purpose (management vs routing)
getIpAddressPurpose(state, interfaceName): { purpose, description }

// Comprehensive prerequisite check
validateL3SwitchPrerequisites(state): { valid, prerequisites, errors }
```

---

## Complete Configuration Example

### Important Prerequisite for `ip address`

- `interface vlan X` (SVI) üzerinde IP atamak için `ip routing` globalde etkin olmalıdır.
- Fiziksel interface (`fa/gi/et`) üzerinde IP atamak için port routed moda alınmalıdır: `no switchport`.
- Özet: L3 switch'te interface IP ataması öncesi doğru L3 bağlamı sağlanmalıdır (`ip routing` veya `no switchport`).

### Scenario: L3 Switch with inter-VLAN routing

```
! Step 1: Enable global routing features
Switch> enable
Switch# configure terminal
Switch(config)# ip routing

! Step 2: Configure memory for routing (if needed)
Switch(config)# sdm prefer lanbase-routing
Switch(config)# reload

! Step 3: Create VLANs
Switch(config)# vlan 10
Switch(config-vlan)# name VLAN10
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name VLAN20
Switch(config-vlan)# exit

! Step 4: Configure SVI (VLAN interfaces)
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Step 5: Assign physical ports to VLANs
Switch(config)# interface fa0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit

Switch(config)# interface fa0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# exit

! Step 6: Configure routed port (optional)
Switch(config)# interface gi0/1
Switch(config-if)# no switchport
Switch(config-if)# ip address 10.0.0.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Result: VLANs 10 and 20 can now route traffic through SVIs
! PC in VLAN 10 can ping gateway 192.168.10.1
! PC in VLAN 20 can ping gateway 192.168.20.1
! Traffic between VLANs routes through the switch
```

---

## Testing the Implementation

### Validation Checklist

- [ ] `no switchport` rejected on L2 switches
- [ ] `no switchport` rejected on VLAN interfaces
- [ ] `no switchport` accepted on L3 switch physical ports
- [ ] `ip routing` rejected on L2 switches
- [ ] `ip routing` required before VLAN inter-routing
- [ ] `ip address` on `interface vlan X` requires global `ip routing`
- [ ] `ip address` on physical ports requires `no switchport` (routed mode)
- [ ] SVI status shows 'down' when no active ports
- [ ] SVI status shows 'up' when ports are active
- [ ] `sdm prefer` requires reload before `ip routing`
- [ ] L2 switch shows management-only message for IP
- [ ] L3 switch shows routing+management message for IP
- [ ] Routed ports show routing purpose message

---

## Related Files

- [L3Validation.ts](src/lib/network/core/L3Validation.ts) - Validation functions
- [globalConfigCommands.ts](src/lib/network/core/globalConfigCommands.ts) - `ip routing` and `sdm prefer` commands
- [interfaceCommands.ts](src/lib/network/core/interfaceCommands.ts) - `no switchport` and `ip address` commands
- [switchModels.ts](src/lib/network/switchModels.ts) - Device type definitions
- [capabilities.ts](src/lib/network/capabilities.ts) - Device capability queries

---

## References

-  Catalyst 2960 (L2): Limited to VLAN management only
-  Catalyst 3650 (L3): Full inter-VLAN routing support
-  NOS Command Reference: ip routing, no switchport, sdm prefer
-  Documentation: L2 vs L3 switching differences
