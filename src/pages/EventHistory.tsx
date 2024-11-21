import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Event, EventRegistration } from '../types';

interface EventWithRegistration extends Event {
  registration: EventRegistration;
}

export default function EventHistory() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEventHistory() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('event_registrations')
          .select(`
            *,
            event:events(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedEvents = data.map((registration) => ({
          ...registration.event,
          registration: {
            id: registration.id,
            event_id: registration.event_id,
            user_id: registration.user_id,
            created_at: registration.created_at,
            payment_status: registration.payment_status,
            payment_amount: registration.payment_amount,
          },
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching event history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEventHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8 text-purple-700" />
        <h1 className="text-3xl font-bold text-purple-700">Event History</h1>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800">No events found</h2>
          <p className="text-gray-600 mt-2">You haven't registered for any events yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{event.title}</h3>
                  <p className="text-gray-600 mt-1">{event.description}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {event.registration.payment_status === 'completed' ? 'Paid' : 'RSVP'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Event Date:</span>{' '}
                  {format(new Date(event.date), 'PPP')}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {event.location}
                </div>
                <div>
                  <span className="font-medium">Registration Date:</span>{' '}
                  {format(new Date(event.registration.created_at), 'PPP')}
                </div>
                {event.registration.payment_amount && (
                  <div>
                    <span className="font-medium">Amount Paid:</span>{' '}
                    ${event.registration.payment_amount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}