const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const CLIENT_ID = "vw9vulse8uzwbjtbbu9jx69lag8bvj";
const CLIENT_SECRET = "beodwtucxx13ld83wq5yt2y9tptfoa";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

async function getAccessToken(clientId, clientSecret) {
  const url = "https://id.twitch.tv/oauth2/token";
  const params = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  };
  const response = await axios.post(url, null, { params });
  return response.data.access_token;
}

async function getCategoryId(accessToken, clientId, categoryName) {
  const url = "https://api.twitch.tv/helix/games";
  const headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${accessToken}`,
  };
  const params = { name: categoryName };
  const response = await axios.get(url, { headers, params });
  if (response.data.data && response.data.data.length > 0) {
    return response.data.data[0].id;
  } else {
    throw new Error(`Category "${categoryName}" not found`);
  }
}

async function getAllLiveStreams(accessToken, clientId, gameId) {
  let allStreams = [];
  let url = "https://api.twitch.tv/helix/streams";
  let headers = {
    "Client-ID": clientId,
    Authorization: `Bearer ${accessToken}`,
  };
  let params = { game_id: gameId, first: 100 };
  let response;

  do {
    response = await axios.get(url, { headers, params });
    allStreams = allStreams.concat(response.data.data);
    params.after = response.data.pagination.cursor;
  } while (response.data.pagination && response.data.pagination.cursor);

  return allStreams;
}

function filterStreamsByTitle(streams, keywords) {
  return streams.filter((stream) =>
    keywords.some((keyword) =>
      stream.title.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/streams", async (req, res) => {
  try {
    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET);
    const categoryName = "Red Dead Redemption 2";
    const gameId = await getCategoryId(accessToken, CLIENT_ID, categoryName);
    const streams = await getAllLiveStreams(accessToken, CLIENT_ID, gameId);
    const keywords = [
      "Saloon RolePlay",
      "Saloon RP",
      "Saloon RôlePlay",
      "SaloonRP",
    ];
    const filteredStreams = filterStreamsByTitle(streams, keywords);

    filteredStreams.forEach((stream) => {
      stream.started_at = stream.started_at.slice(11, 16);
      stream.started_at =
        String((parseInt(stream.started_at.slice(0, 2)) + 2) % 24) +
        stream.started_at.slice(2);
    });

    res.json({ streams: filteredStreams });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
