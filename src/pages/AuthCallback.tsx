import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error('No session found');

        // Handle user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, clubs(*)')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Create new profile for first-time users
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: session.user.id,
                email: session.user.email,
                username: session.user.email?.split('@')[0],
                full_name: session.user.user_metadata?.full_name || '',
                avatar_url: session.user.user_metadata?.avatar_url,
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);

          if (insertError) throw insertError;
          navigate('/events');
          toast.success('Welcome to EventLynk!');
        } else if (profile) {
          // Update username for club admins if not set
          if (profile.role === 'club_admin' && profile.clubs) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                username: profile.clubs.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.id);

            if (updateError) throw updateError;
          }

          // Navigate based on role
          if (profile.is_admin || profile.role === 'club_admin') {
            navigate('/dashboard');
          } else {
            navigate('/events');
          }
          toast.success('Welcome back!');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
    </div>
  );
}