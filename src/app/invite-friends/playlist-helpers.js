import { CohereClient } from "cohere-ai";

const cohereClient = new CohereClient({
  token: process.env.NEXT_PUBLIC_COHERE_API_KEY,
});

export async function addURIsToPlaylist(playlistId, spotifyURIs, session) {
  try {
    const userId = session?.token?.sub;
    const accessToken = session?.token?.access_token;

    if (!userId || !accessToken) {
      alert("User ID or access token not available");
      return;
    }

    if (!playlistId || !spotifyURIs || spotifyURIs.length === 0) {
      alert("Playlist ID or Spotify URIs not provided");
      return;
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position: 0,
          uris: spotifyURIs,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error adding tracks to playlist:", errorData);
      alert("Failed to add tracks to playlist. Please try again.");
      return;
    }

    const data = await response.json();
    console.log("Successfully added tracks to playlist:", data);
    alert(`Successfully added tracks to playlist!`);
  } catch (error) {
    console.error("Error from addURIsToPlaylist:", error);
    alert("Error while adding tracks to playlist.");
  }
}

export const getSpotifyURIS = async (trackIDs, session) => {
  try {
    const accessToken = session?.token?.access_token;

    if (!accessToken) {
      alert("Access token not available");
      return [];
    }
    let trackURIS = [];

    for (const id of trackIDs) {
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${id}`,
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
        const uri = data.uri;

        if (uri) {
          trackURIS.push(data.uri);
          console.log(`Successfully found Spotify URI for "${id}:${data.uri}`);
        } else {
          console.log(`No Spotify URI found: "${id}"`);
        }
      } catch (error) {
        console.error(`Error fetching URI "${id}":`, error);
      }
    }

    console.log("Track URIS:", trackURIS);

    return trackURIS;
  } catch (error) {
    console.error("Error in getSpotifyTrackIDs:", error);
    return [];
  }
};

export const getSpotifyTrackIDs = async (tracks, session) => {
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
          console.log(
            `Successfully found Spotify ID for "${track} ID:${trackItem.id}`
          );
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

export const getCuratedPlaylist = async (tracks, selectedGenre, session) => {
  try {
    if (!tracks || !tracks.length) {
      console.error("No tracks provided for curation");
      return [];
    }

    if (selectedGenre === "Party") {
      selectedGenre =
        "party (high danceability, high energy, high BPM/tempo. no low energy, low BPM/temp, low danceability songs allowed)";
    }
    if (selectedGenre === "Chill") {
      selectedGenre =
        "chill (low danceability, medium/low energy, medium/low BPM/temp. no high energy, high BPM, high danceability songs allowed)";
    }
    if (selectedGenre === "Driving") {
      selectedGenre =
        "party (high danceability, high energy, no low energy and low danceability songs allowed)";
    }

    const message = `Create a playlist of 30 songs for a ${selectedGenre} situation separated by *. The format is 'Song Title Artist Name' with no punctuation separating song title and artist. Ensure variety from each user (must be equallly from each user), no duplicates allowed and must be good (i.e. no white/brown/pink noise) as it will be played on aux. Use the provided list of recently listened songs: ${tracks} as a base. If any songs from the list fit well with the situation include them. If they do not fit the  ${selectedGenre} situation/genre, suggest new songs that align with the overall music taste demonstrated in the list and are suitable for the ${selectedGenre} situation. Ensure the final playlist is a blend of familiar songs and fresh suggestions that fit the mood and genre. Do not number the list as it is separated by *`;

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

export const getTracks = async (usernames, session) => {
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
      const topTracksData = await getLastFmData("user.getTopTracks", username);
      const topTracks =
        topTracksData?.toptracks?.track?.map(
          (track) => `${track.name} by ${track.artist.name} (from ${username})`
        ) || [];

      const lovedTracksData = await getLastFmData(
        "user.getLovedTracks",
        username
      );
      const lovedTracks =
        lovedTracksData?.lovedtracks?.track?.map(
          (track) => `${track.name} by ${track.artist.name} (from ${username})`
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

export const createEmptyPlaylist = async (
  selectedGenre,
  usernames,
  session
) => {
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