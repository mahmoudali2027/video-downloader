# Shared Basket

Create a shopping list, share its link, and check off groceries from any phone. Items with the same name and preference are grouped, with each person's request shown in the item details.

## Run locally

Use Node.js 22 LTS or later. Run `node server.mjs` from the project directory, then open `http://localhost:3000`. On Windows, the local lists are stored under `%LOCALAPPDATA%\.birlikte-al`. Set `DATA_DIR` to use another directory.

## Deploy on Render

Use a Docker web service. Create lists on the public site to share them across devices. Anyone with a list link can add or remove requests and mark items as bought.

The app runs on a single instance. On Render Free, lists can disappear after a spin-down, restart, or redeploy. For persistent storage, mount a persistent disk and set `DATA_DIR` to its mount path. The Docker image defaults to `/data`.
