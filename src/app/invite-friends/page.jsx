"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { Input } from "../../../components/components/ui/input";
import { Button } from "../../../components/components/ui/button";
import {
  addURIsToPlaylist,
  getSpotifyURIS,
  getSpotifyTrackIDs,
  getCuratedPlaylist,
  getTracks,
  createEmptyPlaylist,
} from "./playlist-helpers";


export default function InviteAndChoose() {
  const [token, setToken] = useState("");

  const { data: session, status } = useSession();
  const router = useRouter();

  const genres = ["Party", "Driving", "Chill"];
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [blendId] = useState(
    "blend-" + Math.random().toString(36).substring(2, 9)
  );
  const [formData, setFormData] = React.useState({});

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("token");

    if (!token && hash) {
      token = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"))
        .split("=")[1];

      window.location.hash = "";
      window.localStorage.setItem("token", token);
    }

    setToken(token);
    console.log("token is" + token);
  }, []);

  const handleGeneratePlaylist = async () => {
    if (!selectedGenre) {
      alert("Please select the situation you are in!");
      return;
    }
  
    const usernames = [formData.user1, formData.user2, formData.user3].filter(Boolean);
  
    if (!usernames.length) {
      alert("Please enter at least one username!");
      return;
    }
  
    try {
      const playlistId = await createEmptyPlaylist(selectedGenre, usernames, session);
      const tracks = await getTracks(usernames, session);
      console.log("Generated tracks:", tracks);
  
      const generatedPlaylist = await getCuratedPlaylist(tracks, selectedGenre);
      console.log("Generated Playlist:", generatedPlaylist);
  
      if (generatedPlaylist.length) {
        const spotifyIDs = await getSpotifyTrackIDs(generatedPlaylist, session);
        if (spotifyIDs.length) {
          alert(`Successfully got Spotify IDs!`);
        }
  
        const spotifyURIs = await getSpotifyURIS(spotifyIDs, session);
        if (spotifyURIs.length) {
          alert(`Successfully got Spotify URIs!`);
          addURIsToPlaylist(playlistId, spotifyURIs, session);
        }
      }
    } catch (error) {
      console.error("Error in generating playlist:", error);
      alert("An error occurred while generating the playlist.");
    }
  };
  
  useEffect(() => {
    console.log(formData);
  }, [formData]);

  function handleChange(name, value) {
    setFormData((formField) => ({
      ...formField,
      [name]: value,
    }));
  }

  return (
    <div className="p-6">
      <div>
        <p className="text-white font-normal text-xl mt-5 mb-2">
          Signed in as:
        </p>
        <span className="bold-txt">{session?.user?.name}</span>
        <Button
          className="opacity-70 mt-8 mb-5 underline cursor-pointer"
          onClick={() => {
            signOut({ callbackUrl: "/" });
          }}
        >
          Sign Out
        </Button>
      </div>

      <h1 className="mt-6 mb-4 text-xl font-bold">What is the situation?</h1>
      <div className="flex flex-col gap-4">
        {genres.map((genre) => (
          <Button
            key={genre}
            variant="outline"
            className={
              selectedGenre === genre
                ? "border-2 border-zinc-500 dark:border-zinc-400"
                : "border border-zinc-900 bg-white shadow-sm hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }
            onClick={() => {
              handleChange("genre", genre);
              setSelectedGenre(genre);
            }}
          >
            {genre}
          </Button>
        ))}
      </div>

      {selectedGenre && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-4">Add Friends:</h2>
          <Input
            onChange={(event) => handleChange("user1", event.target.value)}
            placeholder="Enter Last.fm Username"
          />
          <Input
            onChange={(event) => handleChange("user2", event.target.value)}
            placeholder="Enter Last.fm Username"
          />
          <Input
            onChange={(event) => handleChange("user3", event.target.value)}
            placeholder="Enter Last.fm Username"
          />

          <Button onClick={handleGeneratePlaylist}>
            All Friends Joined? Generate Playlist!
          </Button>
        </div>
      )}
    </div>
  );
}
