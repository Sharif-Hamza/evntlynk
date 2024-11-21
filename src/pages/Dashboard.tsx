import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Bell, 
  Users, 
  Plus,
  CheckCircle,
  XCircle,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Event, Announcement, EventRegistration } from '../types';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import CreateEventModal from '../components/CreateEventModal';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';

export default function Dashboard() {
  const { user, userClub } = useAuth();
  const queryClient = useQueryClient();
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    type: 'event' | 'announcement';
    id: string;
  } | null>(null);

  // Query for events
  const { data: events } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const query = supabase
        .from('events')
        .select('*, clubs(name)')
        .order('date', { ascending: true });

      // If user is club admin, filter by club_id
      if (user?.role === 'club_admin' && userClub && !user?.is_admin) {
        query.eq('club_id', userClub.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Event & { clubs: { name: string } })[];
    },
    enabled: !!user?.id && (user?.is_admin || user?.role === 'club_admin'),
  });

  // Query for announcements
  const { data: announcements } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const query = supabase
        .from('announcements')
        .select('*, clubs(name)')
        .order('created_at', { ascending: false });

      // If user is club admin, filter by club_id
      if (user?.role === 'club_admin' && userClub && !user?.is_admin) {
        query.eq('club_id', userClub.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Announcement & { clubs: { name: string } })[];
    },
    enabled: !!user?.id && (user?.is_admin || user?.role === 'club_admin'),
  });

  // Query for RSVP requests
  const { data: rsvpRequests, refetch: refetchRSVP } = useQuery({
    queryKey: ['rsvp-requests'],
    queryFn: async () => {
      let query = supabase
        .from('event_registrations')
        .select(`
          *,
          events (
            id,
            title,
            date,
            capacity,
            club_id,
            clubs (
              name
            )
          ),
          profiles (
            email,
            full_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Only filter by club_id if user is club_admin and not is_admin
      if (user?.role === 'club_admin' && userClub && !user?.is_admin) {
        query = query.eq('events.club_id', userClub.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (EventRegistration & {
        events: Event & { clubs: { name: string } };
        profiles: { email: string; full_name: string };
      })[];
    },
    enabled: !!user?.id && (user?.is_admin || user?.role === 'club_admin'),
  });

  const handleRSVPAction = async (registrationId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status })
        .eq('id', registrationId);

      if (error) throw error;

      toast.success(`RSVP ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rsvp-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['event-registrations'] })
      ]);
      
      // Refetch RSVP requests immediately
      await refetchRSVP();
    } catch (error) {
      console.error('Error updating RSVP status:', error);
      toast.error('Failed to update RSVP status');
    }
  };

  const handleDelete = async (type: 'event' | 'announcement', id: string) => {
    try {
      const { error } = await supabase
        .from(type === 'event' ? 'events' : 'announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`${type === 'event' ? 'Event' : 'Announcement'} deleted successfully`);
      queryClient.invalidateQueries({ 
        queryKey: [type === 'event' ? 'admin-events' : 'admin-announcements'] 
      });
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  // Check for admin or club admin access
  if (!user || (!user.is_admin && user.role !== 'club_admin')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-600 mt-2">You must be an admin or club admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-purple-700">
          {user.role === 'club_admin' && userClub 
            ? `${userClub.name} Dashboard`
            : 'Admin Dashboard'}
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => setShowEventModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Announcement
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Events Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
          </div>
          <div className="space-y-4">
            {events?.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    {event.clubs && (
                      <p className="text-sm text-purple-600">{event.clubs.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDeleteModal({ type: 'event', id: event.id })}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {!events?.length && (
              <p className="text-gray-500 text-center py-4">No events found</p>
            )}
          </div>
        </div>

        {/* Announcements Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">Recent Announcements</h2>
          </div>
          <div className="space-y-4">
            {announcements?.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {announcement.clubs && (
                      <p className="text-sm text-purple-600">{announcement.clubs.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDeleteModal({ type: 'announcement', id: announcement.id })}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {!announcements?.length && (
              <p className="text-gray-500 text-center py-4">No announcements found</p>
            )}
          </div>
        </div>
      </div>

      {/* RSVP Requests Section */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">RSVP Requests</h2>
        </div>
        <div className="space-y-4">
          {rsvpRequests?.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{request.events?.title}</h3>
                  <p className="text-sm text-gray-600">
                    {request.profiles?.full_name} ({request.profiles?.email})
                  </p>
                  {request.events?.clubs && (
                    <p className="text-sm text-purple-600">{request.events.clubs.name}</p>
                  )}
                  {request.message && (
                    <p className="text-sm text-gray-500 mt-2">{request.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRSVPAction(request.id, 'approved')}
                    className="text-green-500 hover:text-green-700"
                  >
                    <CheckCircle className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => handleRSVPAction(request.id, 'rejected')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!rsvpRequests?.length && (
            <p className="text-gray-500 text-center py-4">No pending RSVP requests</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <CreateEventModal
          onClose={() => setShowEventModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-events'] });
            setShowEventModal(false);
          }}
        />
      )}
      
      {showAnnouncementModal && (
        <CreateAnnouncementModal
          onClose={() => setShowAnnouncementModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
            setShowAnnouncementModal(false);
          }}
        />
      )}
      
      {showDeleteModal && (
        <DeleteConfirmModal
          title={`Delete ${showDeleteModal.type === 'event' ? 'Event' : 'Announcement'}`}
          message={`Are you sure you want to delete this ${showDeleteModal.type}? This action cannot be undone.`}
          onConfirm={() => handleDelete(showDeleteModal.type, showDeleteModal.id)}
          onClose={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  );
}