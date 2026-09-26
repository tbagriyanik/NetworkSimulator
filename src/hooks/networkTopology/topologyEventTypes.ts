import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';

/**
 * Event types accepted by topology device interaction handlers.
 *
 * The canvas wires three separate React handlers to the same device element
 * (see DeviceRenderer.tsx):
 *   onMouseDown   -> ReactMouseEvent
 *   onPointerDown -> ReactPointerEvent   (unified mouse + pen + touch)
 *   onTouchStart  -> ReactTouchEvent     (legacy touch devices)
 *
 * A single interaction can therefore originate from any of them, and several
 * handlers deliberately funnel all three into one code path (for example
 * `handleDevicePointerDown` delegates to `handleDeviceMouseDown`).
 *
 * Declaring those handlers as `ReactMouseEvent` and casting at every call
 * site is what previously forced `e as unknown as ReactMouseEvent`
 * assertions: a pointer or touch event was silently relabelled as a mouse
 * event. These aliases state the real contract instead.
 */

/** Any interaction event a device element can emit. Needs no mouse specifics. */
export type TopologyActivationEvent = ReactMouseEvent | ReactPointerEvent | ReactTouchEvent;

/**
 * Interaction events that carry a viewport position. ReactTouchEvent is
 * excluded on purpose: a touch event exposes `touches[].clientX` rather than
 * `clientX` directly, so accepting it here would hide a real bug.
 */
export type TopologyPositionedEvent = ReactMouseEvent | ReactPointerEvent;
