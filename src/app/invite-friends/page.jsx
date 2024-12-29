"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { Input } from "../../../components/components/ui/input";
import { Button } from "../../../components/components/ui/button";

export default function InviteAndChoose() {
  const [token, setToken] = useState("");

  const { data: session, status } = useSession();
  const router = useRouter();

  const genres = ["party", "driving", "chill"];
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

  const getCurrentUserPlaylists = async (session) => {
    try {
      const accessToken = session?.token?.access_token;

      if (!accessToken) {
        alert("Access token not available");
        return [];
      }

      const userPlaylistIds = [];
      let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=25"; 

      while (nextUrl) {
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        console.log("Response status", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching current user's playlists:", errorData);
          alert("Unable to fetch your playlists.");
          return [];
        }

        const playlistData = await response.json();
        console.log("Successfully fetched current user's playlists:", playlistData);

        const currentPageIds = playlistData.items.map(
          (playlist) => playlist.id
        );
        userPlaylistIds.push(...currentPageIds);

        nextUrl = playlistData.next; 
      }

      console.log("Current user's playlist IDs:", userPlaylistIds);
      return userPlaylistIds;
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while fetching your playlists.");
      return [];
    }
  };

  const getSavedPlaylists = async (
    usernames,
    session,
    currentUserPlaylistIds
  ) => {
    try {
      const accessToken = session?.token?.access_token;

      if (!accessToken) {
        alert("Access token not available");
        return [];
      }

      const savedPlaylists = [...currentUserPlaylistIds]; 

      for (const userId of usernames) {
        let nextUrl = `https://api.spotify.com/v1/users/${userId}/playlists?limit=25`;

        while (nextUrl) {
          const response = await fetch(nextUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(
              `Error getting playlists for user ${userId}:`,
              errorData
            );
            alert(
              `Failed to get playlists for this user ${userId}. Continuing with other users...`
            );
            break;
          }

          const playlistData = await response.json();
          console.log(
            `Fetched playlist page for user ${userId}:`,
            playlistData
          );

          const playlistIds = playlistData.items.map((playlist) => playlist.id);

          savedPlaylists.push(...playlistIds);

          nextUrl = playlistData.next;
        }
      }

      console.log("All saved playlists:", savedPlaylists);
      alert("Successfully able to fetch playlists");

      return savedPlaylists;
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while fetching playlists.");
      return [];
    }
  };

  const createEmptyPlaylist = async (selectedGenre, usernames, session) => {
    try {
      const userId = session?.token?.sub;
      const accessToken = session?.token?.access_token;

      if (!userId || !accessToken) {
        alert("User ID or access token not available");
        return null;
      }

      const playlistName = `${selectedGenre} Mix`;
      const description = `${usernames.join(
        " x "
      )} | Made with Pass the Aux by Megan Ong`;

      const response = await fetch(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: playlistName,
            description: description,
            public: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating playlist:", errorData);
        alert("Failed to create playlist. Please try again.");
        return null;
      }

      const playlistData = await response.json();
      const playlistId = playlistData.id;

      alert(`Playlist created! ${playlistData.name}`);
      console.log("Playlist created:", playlistData);
      console.log("Created playlist ID:", playlistId);

      return playlistId;
    } catch (error) {
      console.error("Error from createEmptyPlaylist:", error);
      alert("Error while creating playlist.");
      return null;
    }
  };

  const handleGeneratePlaylist = async () => {
    if (!selectedGenre) {
      alert("Please select the situation you are in!");
      return;
    }

    const usernames = [formData.user1, formData.user2, formData.user3].filter(
      Boolean
    );

    if (!usernames.length) {
      alert("Please enter at least one username!");
      return;
    }

    await createEmptyPlaylist(selectedGenre, usernames, session);
    const currentUserPlaylistIds = await getCurrentUserPlaylists(session);
    const allSavedPlaylists = await getSavedPlaylists(
      usernames,
      session,
      currentUserPlaylistIds
    );
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
            placeholder="Enter Username"
          />
          <Input
            onChange={(event) => handleChange("user2", event.target.value)}
            placeholder="Enter Username"
          />
          <Input
            onChange={(event) => handleChange("user3", event.target.value)}
            placeholder="Enter Username"
          />

          <Button onClick={handleGeneratePlaylist}>
            All Friends Joined? Generate Playlist!
          </Button>
        </div>
      )}
    </div>
  );
}
