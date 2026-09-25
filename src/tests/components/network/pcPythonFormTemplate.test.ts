import { describe, it, expect, beforeEach } from 'vitest';
import { executePythonScript } from '../../../components/network/pc-panel/pcPythonRunner';

/**
 * Tests for the Python GUI Form (Tkinter) sample + the underlying fixes that
 * make it work in the simulated interpreter:
 *  - dict-method dispatch no longer hides real class methods (.get() etc.)
 *  - list-mutator statement helpers fall through to widget methods (.insert())
 *  - StringVar/IntVar/BooleanVar accept the value= keyword form
 */

const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => { mockStorage[key] = val; },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
        removeItem: (key: string) => { delete mockStorage[key]; },
        length: 0,
        key: () => null,
    };
}

let devCounter = 0;

describe('pcPython GUI Form (Tkinter) template + evaluator fixes', () => {
    beforeEach(() => {
        if (typeof localStorage !== 'undefined' && localStorage.clear) {
            localStorage.clear();
        }
    });

    const uniqueDev = () => `pc-form-test-${++devCounter}`;

    it('Entry.insert/get roundtrip works (list-mutator fall-through fix)', () => {
        const script = `
import tkinter as tk
from tkinter import ttk
root = tk.Tk()
ent = ttk.Entry(root, placeholder="IP adresi")
ent.insert(0, "192.168.1.1")
print("IP=" + ent.get())
ent.delete(0, "end")
print("EMPTY=" + ent.get())
root.mainloop()
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('IP=192.168.1.1');
        expect(res.output).toContain('EMPTY=');
    });

    it('Text.insert/delete/get roundtrip works', () => {
        const script = `
import tkinter as tk
root = tk.Tk()
txt = tk.Text(root, height=3)
txt.insert("1.0", "Hazir.")
print("T1=" + txt.get("1.0", "end"))
txt.delete("1.0", "end")
txt.insert("1.0", "BAGLANTI HATASI test")
print("T2=" + txt.get("1.0", "end"))
root.mainloop()
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('T1=Hazir.');
        expect(res.output).toContain('T2=BAGLANTI HATASI test');
    });

    it('Listbox.insert/get works', () => {
        const script = `
import tkinter as tk
root = tk.Tk()
lb = tk.Listbox(root)
lb.insert(0, "GigabitEthernet0/0 - UP")
lb.insert(1, "GigabitEthernet0/1 - DOWN")
print("L0=" + lb.get(0))
print("L1=" + lb.get(1))
print("SZ=" + str(lb.size()))
root.mainloop()
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('L0=GigabitEthernet0/0 - UP');
        expect(res.output).toContain('L1=GigabitEthernet0/1 - DOWN');
        expect(res.output).toContain('SZ=2');
    });

    it('Combobox.set/get and StringVar get work (dict-method dispatch fix)', () => {
        const script = `
import tkinter as tk
from tkinter import ttk
root = tk.Tk()
cmb = ttk.Combobox(root, values=["SSH (Port 22)", "Telnet (Port 23)"])
cmb.set("Telnet (Port 23)")
print("C=" + cmb.get())
root.mainloop()
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('C=Telnet (Port 23)');
    });

    it('StringVar/IntVar/BooleanVar accept the value= keyword form', () => {
        const script = `
import tkinter as tk
s = tk.StringVar(value="8.8.8.8")
i = tk.IntVar(value=42)
b = tk.BooleanVar(value=True)
print("S=" + s.get())
print("I=" + str(i.get()))
print("B=" + str(b.get()))
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('S=8.8.8.8');
        expect(res.output).toContain('I=42');
        expect(res.output).toContain('B=true');
    });

    it('list mutators still work on real lists', () => {
        const script = `
liste = [3, 1, 2]
liste.append(4)
liste.insert(0, 0)
liste.remove(2)
liste.sort()
liste.pop()
print("L=" + str(liste))
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('L=0,1,3');
    });

    it('dict pop()/clear() reach the dict handler instead of being swallowed', () => {
        const script = `
sozluk = {"a": 1, "b": 2}
sozluk.pop("a")
print("P=" + str(len(sozluk)))
sozluk.clear()
print("C=" + str(len(sozluk)))
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('P=1');
        expect(res.output).toContain('C=0');
    });

    it('GUI Form template: baglanti hatasi branches (bos IP, gecersiz IP, protokol yok, zaman asimi, basarili)', () => {
        const script = `
import tkinter as tk
from tkinter import ttk

root = tk.Tk()
root.title("Ag Kontrol Paneli")
root.geometry("460x560")

lbl_title = ttk.Label(root, text="Ag Cihazi Kontrol ve Yapilandirma Formu")
lbl_title.pack(pady=4)
sep1 = ttk.Separator(root, orient="horizontal")
sep1.pack(fill="x", pady=4)

ent_ip = ttk.Entry(root, placeholder="Ornek IP: 192.168.1.1")
ent_ip.insert(0, "192.168.1.1")
ent_ip.pack(pady=4)

cmb_proto = ttk.Combobox(root, values=["SSH (Port 22)", "Telnet (Port 23)", "HTTP (Port 80)", "HTTPS (Port 443)"])
cmb_proto.pack(pady=4)

chk_secure = ttk.Checkbutton(root, text="Guvenli Baglanti (SSL/TLS)", checked=True)
chk_secure.pack(pady=4)

rad_mode1 = ttk.Radiobutton(root, text="Normal Mod", value="normal", checked=True)
rad_mode1.pack(pady=2)
rad_mode2 = ttk.Radiobutton(root, text="Hata Ayiklama (Debug)", value="debug")
rad_mode2.pack(pady=2)

txt_log = tk.Text(root, height=5)
txt_log.insert("1.0", "Hazir. Cihaz bilgileri bekleniyor...")
txt_log.pack(fill="both", pady=4)

lbl_status = ttk.Label(root, text="Durum: Beklemede")
lbl_status.pack(pady=2)

lst_items = tk.Listbox(root)
lst_items.insert(0, "GigabitEthernet0/0 - UP")
lst_items.insert(1, "GigabitEthernet0/1 - DOWN")
lst_items.insert(2, "Vlan 1 - UP")
lst_items.pack(fill="both", pady=4)

def ip_gecerli_mi(ip):
    parcalar = ip.split(".")
    if len(parcalar) != 4:
        return False
    for p in parcalar:
        if not p.isdigit():
            return False
        if int(p) < 0 or int(p) > 255:
            return False
    return True

def on_connect():
    ip = ent_ip.get()
    proto = cmb_proto.get()
    txt_log.delete("1.0", "end")

    if ip == "":
        txt_log.insert("1.0", "BAGLANTI HATASI: IP adresi bos birakilamaz!")
        lbl_status.set("Durum: BAGLANTI HATASI (Bos IP)")
        return

    if not ip_gecerli_mi(ip):
        txt_log.insert("1.0", "BAGLANTI HATASI: Gecersiz IP adresi -> " + ip)
        lbl_status.set("Durum: BAGLANTI HATASI (Gecersiz IP)")
        return

    if proto == "":
        txt_log.insert("1.0", "BAGLANTI HATASI: Lutfen bir protokol secin!")
        lbl_status.set("Durum: BAGLANTI HATASI (Protokol Yok)")
        return

    erisilebilirler = ["192.168.1.1", "192.168.1.10"]
    if ip not in erisilebilirler:
        txt_log.insert("1.0", "BAGLANTI HATASI: Hedef cihaza ulasilamadi (zaman asimi) -> " + ip)
        lbl_status.set("Durum: BAGLANTI HATASI (Zaman Asimi)")
        return

    txt_log.insert("1.0", "Baglanti basarili -> " + ip + " (" + proto + ")")
    lbl_status.set("Durum: Baglanti Basarili")

btn_action = ttk.Button(root, text="Baglantiyi Baslat", command=on_connect)
btn_action.pack(pady=6)

def test_et(durum, ip, proto):
    ent_ip.insert(0, ip)
    cmb_proto.set(proto)
    on_connect()
    print("[" + durum + "] => " + txt_log.get("1.0", "end"))

test_et("1-BosIP", "", "SSH (Port 22)")
test_et("2-Gecersiz999", "999.1.1.1", "SSH (Port 22)")
test_et("2-GecersizAbc", "192.168.1.abc", "SSH (Port 22)")
test_et("2-Gecersiz3Part", "192.168.1", "SSH (Port 22)")
test_et("3-ProtokolYok", "192.168.1.1", "")
test_et("4-ZamanAsimi", "10.0.0.5", "Telnet (Port 23)")
test_et("5-Basarili", "192.168.1.1", "SSH (Port 22)")
test_et("5-BasariliHttps", "192.168.1.10", "HTTPS (Port 443)")

root.mainloop()
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('[1-BosIP] => BAGLANTI HATASI: IP adresi bos birakilamaz!');
        expect(res.output).toContain('[2-Gecersiz999] => BAGLANTI HATASI: Gecersiz IP adresi -> 999.1.1.1');
        expect(res.output).toContain('[2-GecersizAbc] => BAGLANTI HATASI: Gecersiz IP adresi -> 192.168.1.abc');
        expect(res.output).toContain('[2-Gecersiz3Part] => BAGLANTI HATASI: Gecersiz IP adresi -> 192.168.1');
        expect(res.output).toContain('[3-ProtokolYok] => BAGLANTI HATASI: Lutfen bir protokol secin!');
        expect(res.output).toContain('[4-ZamanAsimi] => BAGLANTI HATASI: Hedef cihaza ulasilamadi (zaman asimi) -> 10.0.0.5');
        expect(res.output).toContain('[5-Basarili] => Baglanti basarili -> 192.168.1.1 (SSH (Port 22))');
        expect(res.output).toContain('[5-BasariliHttps] => Baglanti basarili -> 192.168.1.10 (HTTPS (Port 443))');
    });

    it('GUI Form template: ip_gecerli_mi edge cases', () => {
        const script = `
def ip_gecerli_mi(ip):
    parcalar = ip.split(".")
    if len(parcalar) != 4:
        return False
    for p in parcalar:
        if not p.isdigit():
            return False
        if int(p) < 0 or int(p) > 255:
            return False
    return True

print("V1=" + str(ip_gecerli_mi("192.168.1.1")))
print("V2=" + str(ip_gecerli_mi("255.255.255.0")))
print("V3=" + str(ip_gecerli_mi("256.1.1.1")))
print("V4=" + str(ip_gecerli_mi("-1.1.1.1")))
print("V5=" + str(ip_gecerli_mi("1.2.3")))
print("V6=" + str(ip_gecerli_mi("1.2.3.4.5")))
print("V7=" + str(ip_gecerli_mi("0.0.0.0")))
`;
        const res = executePythonScript(script, [], undefined, uniqueDev());
        expect(res.error).toBeUndefined();
        expect(res.output).toContain('V1=true');
        expect(res.output).toContain('V2=true');
        expect(res.output).toContain('V3=false');
        expect(res.output).toContain('V4=false');
        expect(res.output).toContain('V5=false');
        expect(res.output).toContain('V6=false');
        expect(res.output).toContain('V7=true');
    });
});