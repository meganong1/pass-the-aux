"use client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "../../components/components/ui/button";
import "./home.css";
import { FaSpotify } from "react-icons/fa";
import { Open_Sans } from "next/font/google";
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["600", "600", "700"],
});

export default function Home() {
  const { data: session } = useSession();

  console.log(session);

  return (
    <div className="page-container" suppressHydrationWarning>
      <h1 className="title font-bold mb-4">Pass the Aux</h1>
      {session ? (
        redirect("/invite-friends")
      ) : (
        <Button onClick={() => signIn()}>
          <FaSpotify /> Sign In with Spotify
        </Button>
      )}
    </div>
  );
}
