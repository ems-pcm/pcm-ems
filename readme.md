Part A — Create the script project

Go to script.google.com in your browser.
Make sure you're signed in with your personal Gmail account.
Click + New project (top-left).
You'll see a code editor with a file called Code.gs containing some default text. Select all of that text and delete it.
Paste in the full CloudSync.gs code I gave you earlier (the one with getSheet_, doGet, doPost, etc.).
Click the project name at the very top (it says "Untitled project") and rename it to Campus Desk Sync.
Press Ctrl+S (or Cmd+S on Mac) to save.

Part B — Make the app "public" before deploying
This is the part that was confusing you — we need to do this before deploying, or right after.

In the left sidebar of the script editor, click the gear/cog icon ⚙️ (Project Settings).
Scroll down to a box labeled "Google Cloud Platform (GCP) Project". It shows a project number.
Click the blue link/button that says something like "Change project" — actually, don't change it. Instead look for any clickable project number or link there and click it. This opens Google Cloud Console in a new tab.
In that new tab (Google Cloud Console), look at the left sidebar → find "APIs & Services" → click "OAuth consent screen".
You'll see a status near the top: Publishing status: Testing.
Click the button "Publish App".
A confirmation box pops up warning about verification — click Confirm (this is totally fine and safe for your own small script; Google's "verification" process is only required for apps requesting sensitive scopes at large scale, not for a private tool like this).
The status should now say Publishing status: In production.

(If Google blocks you here saying required fields are missing — like "App name" or "User support email" — fill those in with anything reasonable, e.g. App name: "Campus Desk Sync", your email as support email — then try Publish again.)
Part C — Deploy as a Web App

Go back to the script.google.com tab.
Click Deploy (top-right, blue button) → New deployment.
Click the gear/cog icon next to "Select type" → choose Web app.
Fill in:

Description: v1
Execute as: Me
Who has access: select Anyone (it should now be available after Part B)


Click Deploy.
Google will ask to authorize permissions — click through:

"Review permissions" → choose your account
It may warn "Google hasn't verified this app" → click Advanced → Go to Campus Desk Sync (unsafe) → Allow


You'll now see a Web app URL ending in /exec. Copy this entire URL.

Part D — Test it works

Open a new browser tab — ideally an incognito/private window, so you're testing as a stranger would.
Paste your URL and add ?room=test to the end, like:

   https://script.google.com/macros/s/AKfycb.../exec?room=test

Press enter. You should see:

   {"data":null}
with no login prompt. If you see that, it's working.
Part E — Connect it to Campus Desk

Open your live GitHub Pages site.
Log in as admin.
Go to Settings → Cloud sync.
Paste your /exec URL into Sync endpoint URL.
Type a room name like mycollege into Room / dataset key.
Tick Enable live sync.
Click Save sync settings.
Click ⬆ Push this device → cloud now.