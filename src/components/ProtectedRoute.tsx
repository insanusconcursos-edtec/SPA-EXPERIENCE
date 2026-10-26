import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onlyAdmin?: boolean;
  onlyTherapist?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  onlyAdmin = false,
  onlyTherapist = false
}) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTherapist, setIsTherapist] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthenticated(true);
        try {
          // Fetch user document from Firestore to read role
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setIsAdmin(userData.role === 'admin');
            setIsTherapist(userData.role === 'therapist');
          } else {
            setIsAdmin(false);
            setIsTherapist(false);
          }
        } catch (error) {
          console.error('Error verifying user role:', error);
          setIsAdmin(false);
          setIsTherapist(false);
        }
      } else {
        setAuthenticated(false);
        setIsAdmin(false);
        setIsTherapist(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Premium, luxury cinematic loading state (Dark Seduction)
  if (loading) {
    return (
      <div id="auth-route-loader" className="min-h-screen bg-black flex flex-col justify-center items-center selection:bg-[#D4AF37] selection:text-black relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative flex flex-col items-center">
          {/* Pulsing Gold Logo */}
          <div className="h-16 w-16 rounded-xl border border-[#D4AF37]/40 bg-zinc-950 flex items-center justify-center text-[#D4AF37] shadow-gold-glow animate-pulse mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          
          {/* Elegant Serif Font Loading Text */}
          <h2 className="text-xl font-light tracking-[0.2em] text-white uppercase font-serif-luxury text-center">
            Spa <span className="text-[#D4AF37]">Experience</span>
          </h2>
          <p className="text-[9px] tracking-[0.25em] text-zinc-500 uppercase mt-2 animate-pulse">
            Verificando Credenciais Exclusivas...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated? Send to auth screen
  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Admin routing restriction
  if (onlyAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Therapist routing restriction (allows therapists and admins)
  if (onlyTherapist && !isTherapist && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
