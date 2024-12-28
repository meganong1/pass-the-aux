"use client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import { redirect } from 'next/navigation'
import { Button } from "../../components/components/ui/button";

export default function Home() {
  const { data: session } = useSession();

  console.log(session);

  return (
    <div className="p-6" suppressHydrationWarning>
      <h1 className="text-3xl font-bold mb-4">Pass the Aux</h1>
      <p className="text-lg mb-6">
        Welcome to the app. This is the home page.
      </p>

      {session ? (
        // <div>
        //   <p className="text-white font-normal text-xl mt-5 mb-2">
        //     Signed In as
        //   </p>
        //   <span className="bold-txt">{session?.user?.name}</span>
        //   <p
        //     className="opacity-70 mt-8 mb-5 underline cursor-pointer"
        //     onClick={() => signOut()}
        //   >
        //     Sign Out
        //   </p>
        // </div>
        redirect('/invite-friends')

      ) : (
        <Button
          onClick={() => signIn()}
        >
          Sign In with Spotify
        </Button>
      )}
    </div>
  );
}
