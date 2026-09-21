import { createAccessPointAction, createEventAction, createVolunteerAction } from "@/app/actions";
import { Button, Input, Label, Select } from "@/components/ui";
import type { Campus, Section } from "@/lib/types";

export function VolunteerForm({ sections }: { sections: Section[] }) {
  return (
    <form action={createVolunteerAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="fullName">Full Name (required)</Label>
        <Input id="fullName" name="fullName" placeholder="Lerato Mokoena" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone (required)</Label>
        <Input id="phone" name="phone" placeholder="+27 82 000 0000" required />
      </div>
      <div>
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" name="email" type="email" placeholder="volunteer@crc.org" />
      </div>
      <div>
        <Label htmlFor="membershipStatus">Membership Status (required)</Label>
        <Select id="membershipStatus" name="membershipStatus" defaultValue="MEMBER">
          <option value="MEMBER">Member</option>
          <option value="NON_MEMBER">Non Member</option>
          <option value="NEW_COMER">New Comer</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="role">Role (required)</Label>
        <Select id="role" name="role" defaultValue="VOLUNTEER">
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="DEPARTMENT_HEAD">Department Head</option>
          <option value="SECTION_LEADER">Section Leader</option>
          <option value="VOLUNTEER">Volunteer</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="availability">Availability (required)</Label>
        <Select id="availability" name="availability" defaultValue="BOTH">
          <option value="SUNDAY">Sunday</option>
          <option value="THURSDAY">Thursday</option>
          <option value="BOTH">Both</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="sectionId">Section (required)</Label>
        <Select id="sectionId" name="sectionId" defaultValue={sections[0]?.id}>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional notes" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">Add Volunteer</Button>
      </div>
    </form>
  );
}

export function EventForm({ campuses }: { campuses: Campus[] }) {
  return (
    <form action={createEventAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" name="name" placeholder="Sunday Service" required />
      </div>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required />
      </div>
      <div>
        <Label htmlFor="startTime">Start Time</Label>
        <Input id="startTime" name="startTime" type="time" required />
      </div>
      <div>
        <Label htmlFor="type">Type</Label>
        <Select id="type" name="type" defaultValue="SUNDAY">
          <option value="REHEARSAL">Rehearsal</option>
          <option value="SUNDAY">Sunday</option>
          <option value="SPECIAL">Special</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="sundayService">Sunday Service Slot</Label>
        <Select id="sundayService" name="sundayService" defaultValue="NONE">
          <option value="NONE">None</option>
          <option value="AM1">AM1</option>
          <option value="AM2">AM2</option>
          <option value="PM">PM</option>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="campusId">Campus</Label>
        <Select id="campusId" name="campusId" defaultValue={campuses[0]?.id}>
          {campuses.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input name="allowDuplicate" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
        Allow duplicate check-ins
      </label>
      <div className="md:col-span-2">
        <Button type="submit">Create Event</Button>
      </div>
    </form>
  );
}

export function AccessPointForm() {
  return (
    <form action={createAccessPointAction} className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Access Point Name</Label>
        <Input id="name" name="name" placeholder="Main Gate" required />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Main Auditorium" required />
      </div>
      <div>
        <Label htmlFor="color">Access Color</Label>
        <Input id="color" name="color" type="color" defaultValue="#22c55e" />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          name="isActive"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          defaultChecked
        />
        Active
      </label>
      <div className="md:col-span-2">
        <Button type="submit">Create Access Point</Button>
      </div>
    </form>
  );
}
