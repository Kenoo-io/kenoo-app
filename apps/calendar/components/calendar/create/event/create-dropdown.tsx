//components/agent-calendar/create/event/create-dropdown.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock,
  CalendarDays,
  CalendarOff,
  ChevronDown,
  Plus,
} from "lucide-react";
import { CreatePopup, EventType } from "./create-popup";
import { Event } from "./event";
import { OutOfOffice } from "./out-of-office";
import { AppointmentSchedule } from "./appointment-schedule";

interface CreateDropdownProps {
  onEventTypeSelect?: (type: EventType) => void;
}

export function CreateDropdown({ onEventTypeSelect }: CreateDropdownProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType>('event');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupSession, setPopupSession] = useState(0);

  const handleEventTypeSelect = (type: EventType) => {
    setSelectedEventType(type);
    setPopupSession((session) => session + 1);
    setIsPopupOpen(true);
    onEventTypeSelect?.(type);
  };

  const handleEventSubmit = (formData: any) => {
    // Handle the event creation here based on the type
    console.log('New item created:', formData);
    setIsPopupOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[70%] h-[60px] mb-4 rounded-[20px] bg-kenoo-white/80 hover:bg-kenoo-white shadow-[0_2px_8px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)] border-2 transition-all duration-200 text-gray-600 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <Plus className="mr-2 h-4 w-4 text-gray-600" />
            Create
            <ChevronDown className="ml-2 h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] bg-kenoo-white">
          <DropdownMenuItem 
            onClick={() => handleEventTypeSelect('event')}
            className="hover:bg-slate-100 text-gray-600 text-sm font-light py-3"
          >
            <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
            <span>Event</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleEventTypeSelect('outOfOffice')}
            className="hover:bg-slate-100 text-gray-600 text-sm font-light py-3"
          >
            <CalendarOff className="mr-2 h-4 w-4 text-gray-500" />
            <span>Out of Office</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleEventTypeSelect('appointmentSchedule')}
            className="hover:bg-slate-100 text-gray-600 text-sm font-light py-3"
          >
            <CalendarClock className="mr-2 h-4 w-4 text-gray-500" />
            <span>Appointment Schedule</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePopup
        key={popupSession}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        initialType={selectedEventType}
        onSubmit={handleEventSubmit}
        submitButtonText="Save"
        eventComponent={<Event />}
        outOfOfficeComponent={<OutOfOffice />}
        appointmentScheduleComponent={<AppointmentSchedule />}
      />
    </>
  );
}
