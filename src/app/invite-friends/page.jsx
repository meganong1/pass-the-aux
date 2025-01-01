"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter, redirect } from "next/navigation";
import { Input } from "../../../components/components/ui/input";
import { Button } from "../../../components/components/ui/button";
import { get } from "http";
import { CohereClient } from "cohere-ai";

const cohereClient = new CohereClient({
  token: process.env.NEXT_PUBLIC_COHERE_API_KEY,
});

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

  const getSpotifyTrackIDs = async (tracks) => {
    try {
      const accessToken = session?.token?.access_token;
  
      if (!accessToken) {
        alert("Access token not available");
        return [];
      }
  
      const trackIDs = [];
  
      for (const track of tracks) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?q=${track}&type=track&limit=1&offset=0`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
  
          if (!response.ok) {
            console.error(`Error searching for track: ${track}`);
            continue;
          }
  
          const data = await response.json();
          const trackItem = data.tracks?.items?.[0];
  
          if (trackItem) {
            trackIDs.push(trackItem.id);
            console.log(`Successfully found Spotify ID for "${track} ID:${trackItem.id}`);
          } else {
            console.log(`No Spotify track found: "${track}"`);
          }
        } catch (error) {
          console.error(`Error fetching track "${track}":`, error);
        }
      }
  
      return trackIDs;
    } catch (error) {
      console.error("Error in getSpotifyTrackIDs:", error);
      return [];
    }
  };

  const getCuratedPlaylist = async (tracks, selectedGenre) => {
    try {
      if (!tracks || !tracks.length) {
        console.error("No tracks provided for curation");
        return [];
      }
      const message = `Create a playlist of 30 songs for a ${selectedGenre} situation separated by *. The format is 'Song Title Artist Name' with no punctuation separating song title and artist. Ensure variety from each user, no duplicates allowed and must be good (i.e. no white/brown/pink noise) as it will be played on aux. Use the provided list of recently listened songs: ${tracks} as a base. If any songs from the list fit well with the situation include them. If they do not fit the  ${selectedGenre} situation/genre, suggest new songs that align with the overall music taste demonstrated in the list and are suitable for the ${selectedGenre} situation. Ensure the final playlist is a blend of familiar songs and fresh suggestions that fit the mood and genre. Do not number the list as it is separated by *`;

      console.log("Message to Cohere API:", message);
      const cohereResponse = await cohereClient.chat({
        model: "command-r-plus-08-2024",
        message: message,
        preamble:
          "You are an AI assistant trained to assist users by responding only in array of strings of size 30, separated by *. Do not add numbers or bullets to list and keep it on one line. Do not include a numbered or bullet list.",
      });

      console.log("Full Cohere Response:", cohereResponse);

      if (!cohereResponse || !cohereResponse.text) {
        console.error("Invalid response structure from Cohere API");
        return [];
      }

      const curatedPlaylist = cohereResponse.text
        .split("*")
        .map((item) => item.trim()) 
        .filter((item) => item.length > 0); 

      console.log("Formatted Playlist:", curatedPlaylist);
      return curatedPlaylist;
    } catch (error) {
      console.error("Error in getCuratedPlaylist:", error.message);
      return [];
    }
  };

  const getTracks = async (usernames, session) => {
    try {
      const fetchUserTracks = async (username) => {
        const getLastFmData = async (method, userParam) => {
          const url = new URL("https://ws.audioscrobbler.com/2.0/");
          url.searchParams.append("method", method);
          url.searchParams.append("user", userParam);
          url.searchParams.append("limit", 25);
          url.searchParams.append(
            "api_key",
            process.env.NEXT_PUBLIC_LASTFM_API_KEY
          );
          url.searchParams.append("format", "json");

          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Error fetching ${method} for user ${userParam}`);
            return [];
          }

          const data = await response.json();
          return data;
        };
        const topTracksData = await getLastFmData(
          "user.getTopTracks",
          username
        );
        const topTracks =
          topTracksData?.toptracks?.track?.map(
            (track) =>
              `${track.name} by ${track.artist.name} (from ${username})`
          ) || [];

        const lovedTracksData = await getLastFmData(
          "user.getLovedTracks",
          username
        );
        const lovedTracks =
          lovedTracksData?.lovedtracks?.track?.map(
            (track) =>
              `${track.name} by ${track.artist.name} (from ${username})`
          ) || [];

        const recentTracksData = await getLastFmData(
          "user.getRecentTracks",
          username
        );
        const recentTracks =
          recentTracksData?.recenttracks?.track?.map(
            (track) =>
              `${track.name} by ${track.artist["#text"]} (from ${username})`
          ) || [];

        return [...topTracks, ...lovedTracks, ...recentTracks];
      };

      const tracksPromises = usernames.map((username) =>
        fetchUserTracks(username)
      );
      const usersTracks = await Promise.all(tracksPromises);

      const allTracks = usersTracks.flat();

      console.log("Fetched tracks:", allTracks);

      return allTracks;
    } catch (error) {
      console.error("Error in getTracks function:", error);
      alert("Failed to fetch tracks");
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

    const tracks = await getTracks(usernames);
    console.log("Generated tracks:", tracks);
    const generatedPlaylist = await getCuratedPlaylist(tracks, selectedGenre);
    console.log("Generated Playlist:", generatedPlaylist);

    if (generatedPlaylist.length) {
    }
    const spotifyIDs = await getSpotifyTrackIDs(generatedPlaylist)
    if (spotifyIDs.length) {
      alert(`Succesfully got Spotify IDs!`);
    }  };

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
