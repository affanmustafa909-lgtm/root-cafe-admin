import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
import{useState,type ReactNode}from'react';
import{AuthProvider}from'@/features/auth/AuthContext';
import{Toaster}from'@/shared/ui';

export function Providers({children}:{children:ReactNode}){
  const[c]=useState(()=>new QueryClient({
    defaultOptions:{
      queries:{
        staleTime:30_000,
        gcTime:10*60_000,
        retry:1,
        refetchOnWindowFocus:false,
        refetchOnReconnect:false,
      },
    },
  }));
  return (
    <QueryClientProvider client={c}>
      <AuthProvider>
        <Toaster>{children}</Toaster>
      </AuthProvider>
    </QueryClientProvider>
  );
}
