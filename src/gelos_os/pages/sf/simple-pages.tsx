import {
  C,
  OUTLET_STATUSES,
  POSM_TYPES,
  REPS,
  TRADE_CHANNELS,
  VISIT_PURPOSES,
  VISIT_STATUSES,
} from "../../constants";
import { today, uid } from "../../lib";
import { Field } from "../../ui";
import { makeSimplePage } from "./makeSimplePage";

export const OutletScouting = makeSimplePage(
  "Outlet Scouting",
  "outlets",
  C.sfBlue,
  [
    { label: "Outlet", key: "name" },
    { label: "Channel", key: "channel", badge: true },
    { label: "Location", key: "location" },
    { label: "Contact", key: "contact" },
    { label: "Rep", key: "rep" },
    { label: "Date", key: "date" },
    { label: "Status", key: "status", badge: true },
  ],
  (form: any, upd: any, _data: any, view: string, rep: string) => [
    <Field key="name" label="Outlet Name" name="name" value={form.name || ""} onChange={upd} full />,
    <Field key="channel" label="Channel" name="channel" value={form.channel || TRADE_CHANNELS[0]} onChange={upd} options={TRADE_CHANNELS} />,
    <Field key="location" label="Location" name="location" value={form.location || ""} onChange={upd} />,
    <Field key="contact" label="Contact" name="contact" value={form.contact || ""} onChange={upd} />,
    <Field
      key="rep"
      label="Rep"
      name="rep"
      value={form.rep || (view === "rep" ? rep : REPS[0])}
      onChange={upd}
      options={view === "rep" ? [rep] : REPS}
    />,
    <Field key="status" label="Status" name="status" value={form.status || "Active"} onChange={upd} options={OUTLET_STATUSES} />,
    <Field key="date" label="Date" name="date" value={form.date || today()} onChange={upd} type="date" />,
    <Field key="notes" label="Notes" name="notes" value={form.notes || ""} onChange={upd} type="textarea" full />,
  ],
  { name: "", channel: TRADE_CHANNELS[0], location: "", contact: "", status: "Active", rep: REPS[0], notes: "" },
  "+ Add Outlet",
);

export const ShopVisits = makeSimplePage(
  "Shop Visits",
  "visits",
  C.sfBlue,
  [
    { label: "Outlet", key: "outlet" },
    { label: "Rep", key: "rep" },
    { label: "Date", key: "date" },
    { label: "Purpose", key: "purpose" },
    { label: "Outcome", key: "outcome" },
    { label: "Status", key: "status", badge: true },
  ],
  (form: any, upd: any, data: any, view: string, rep: string) => [
    <Field key="outlet" label="Outlet" name="outlet" value={form.outlet || ""} onChange={upd} options={data.outlets.map((o: any) => o.name)} />,
    <Field key="rep" label="Rep" name="rep" value={form.rep || (view === "rep" ? rep : REPS[0])} onChange={upd} options={view === "rep" ? [rep] : REPS} />,
    <Field key="date" label="Date" name="date" value={form.date || today()} onChange={upd} type="date" />,
    <Field key="purpose" label="Purpose" name="purpose" value={form.purpose || VISIT_PURPOSES[0]} onChange={upd} options={VISIT_PURPOSES} />,
    <Field key="status" label="Status" name="status" value={form.status || "Completed"} onChange={upd} options={VISIT_STATUSES} />,
    <Field key="outcome" label="Outcome" name="outcome" value={form.outcome || ""} onChange={upd} type="textarea" full />,
    <Field key="followup" label="Follow-up" name="followup" value={form.followup || ""} onChange={upd} type="textarea" full />,
  ],
  { outlet: "", rep: REPS[0], purpose: VISIT_PURPOSES[0], outcome: "", followup: "", status: "Completed" },
  "+ Log Visit",
);

export const POSMTracker = makeSimplePage(
  "POSM Tracker",
  "posm",
  C.purple,
  [
    { label: "Type", key: "type" },
    { label: "Outlet", key: "outlet" },
    { label: "Qty", key: "qty" },
    { label: "Rep", key: "rep" },
    { label: "Date", key: "date" },
    { label: "Status", key: "status", badge: true },
  ],
  (form: any, upd: any, data: any, view: string, rep: string) => [
    <Field key="type" label="Type" name="type" value={form.type || POSM_TYPES[0]} onChange={upd} options={POSM_TYPES} />,
    <Field key="outlet" label="Outlet" name="outlet" value={form.outlet || ""} onChange={upd} options={data.outlets.map((o: any) => o.name)} />,
    <Field key="qty" label="Qty" name="qty" value={form.qty || 1} onChange={upd} type="number" />,
    <Field key="rep" label="Rep" name="rep" value={form.rep || (view === "rep" ? rep : REPS[0])} onChange={upd} options={view === "rep" ? [rep] : REPS} />,
    <Field key="date" label="Date" name="date" value={form.date || today()} onChange={upd} type="date" />,
    <Field key="status" label="Status" name="status" value={form.status || "Deployed"} onChange={upd} options={["Deployed", "Pending"]} />,
  ],
  { type: POSM_TYPES[0], outlet: "", qty: 1, rep: REPS[0], status: "Deployed" },
  "+ Add POSM",
);
