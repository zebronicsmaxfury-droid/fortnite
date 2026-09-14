====================================================================
 MonkeyCode <-> PC  INSTANT TWO-WAY SYNC  (monkeycode-sync)
====================================================================

WHAT THIS DOES
--------------
This tool sits on your Windows PC and scans the repo every
3 SECONDS. It keeps two things in sync, in BOTH directions:

  (1) GitHub repo  ->  your PC folder
      MonkeyCode edits a file, it appears in
      C:\Users\hxh\Desktop\games! within ~3 seconds.

  (2) your PC folder  ->  GitHub repo
      You edit / add / delete a file in
      C:\Users\hxh\Desktop\games!, it is automatically
      committed and pushed to GitHub within ~3 seconds.

No zip download. No extract. No whole-project re-download.
Just the changed files, instantly, both ways.

Works while MonkeyCode runs in Brave (or Chrome / Edge / Firefox).


WHAT IS INSIDE
--------------
  monkeycode-sync.ps1   The sync engine (the watcher).
  monkeycode-sync.bat   Double-click this to start it.
  README.txt            This file.


BEFORE YOU START (one time)
---------------------------
1. Install "Git for Windows" if you do not have it:
      https://git-scm.com/download/win
   Click Next on every prompt (defaults are fine).

2. Unzip this folder somewhere permanent, for example:
      C:\Users\hxh\Desktop\monkeycode-sync

   If this folder arrived through the sync itself (e.g. inside
   C:\Users\hxh\Desktop\games!\monkeycode-sync), that is fine too -
   just double-click the .bat inside it. Keeping the tool in its own
   folder (not inside games!) avoids it re-syncing itself.

   Keep these 3 files together in the SAME folder.

3. The first time a PC change is pushed, Git may pop up a
   GitHub login window (Git Credential Manager). Sign in with the
   GitHub account that owns the repo. After that it is remembered.
   Note: you need WRITE access to the repo for the PC -> repo
   direction to work. The repo -> PC direction works read-only.


HOW TO RUN (every time)
-----------------------
1. Double-click:  monkeycode-sync.bat
2. A black window opens and says
      "MonkeyCode instant sync is RUNNING (TWO-WAY)"
3. Leave that window open. That is the watcher.
4. Now edit your repo on MonkeyCode web OR edit files in
   C:\Users\hxh\Desktop\games!. Within ~3 seconds the change
   shows up on the other side and the black window prints a line:

      [12:01:03] [FILE] REPO->PC  index.html
      [12:01:06] [OK]   PC -> REPO: committed changes.
      [12:01:06] [PC]   PC -> REPO: pushed 1 change(s).

First run only: it clones the repo into a hidden helper folder
(%USERPROFILE%\.monkeycode-sync\repo) and copies the current files
to C:\Users\hxh\Desktop\games! one time. After that it is
change-only (fast).


HOW TO CHANGE THE SETTINGS
--------------------------
Open monkeycode-sync.ps1 with Notepad and look at the top "param"
block. Edit the value after the "=" sign, keep the quotes:

  Target   = where files land   -> default C:\Users\hxh\Desktop\games!
  RepoUrl  = your GitHub repo   -> default the fortnite repo
  Branch   = branch to watch    -> default main
  Interval = scan seconds       -> default 3
  AllowDelete = mirror deletes  -> default true
  Ignore   = skip temp files    -> *.tmp, *~, *.swp, etc.

You can also run with switches:
  -OneWay   : turns OFF "PC -> repo" (old one-way behaviour)
  -Once     : runs a single sync cycle, then exits

Example: to land files in a different folder, change the line to:
  [string]$Target = "C:\Users\hxh\Desktop\my project"


IF BOTH SIDES CHANGE THE SAME FILE
----------------------------------
If MonkeyCode and your PC both change the same file before a sync,
the repo (GitHub) version wins, and your PC version is backed up to:

      %USERPROFILE%\.monkeycode-sync\conflicts\<date-time>\...

The black window prints a yellow "CONFLICT ..." warning. Nothing is
silently lost - look in the conflicts folder to recover your copy.

Similarly, if you change a file on your PC and MonkeyCode deletes it
(or the other way around), the repo state wins and your PC copy is
backed up first when it was locally modified.


BRAVE / BROWSER NOTES
---------------------
The sync does not touch your browser. It talks straight to GitHub.

If GitHub pages in Brave look cached (old version) while the black
window says updated, force-refresh Brave with:
      Ctrl + Shift + R
That only affects what the browser shows, not the files on disk.


STOPPING
--------
Close the black window, or press Ctrl+C inside it.


TROUBLESHOOTING
---------------
- "Git is not installed": install Git for Windows (link above),
  close the window, run the .bat again.
- "Cannot reach GitHub right now": internet is down or GitHub is
  slow. It retries every 3 seconds automatically; nothing to do.
- "push failed (GitHub login/permissions?)": the change is saved
  locally and retried automatically. Make sure you have write access
  to the repo and that the GitHub login window was completed.
- Windows blocks the script? The .bat already uses
  -ExecutionPolicy Bypass, so it should just run. If SmartScreen
  warns, choose "More info" -> "Run anyway" (it is your own file).
- Nothing appears in games! after a MonkeyCode edit: make sure
  MonkeyCode actually pushed (check the repo on github.com).
- Your PC edit did not reach GitHub: check the black window for a
  red push error, and confirm the copy of monkeycode-sync.ps1 points
  at the RIGHT repo (RepoUrl) - see the note below.
- Want a clean start: delete the hidden helper folder
  %USERPROFILE%\.monkeycode-sync and the contents of games!, then
  run the .bat again.
- The repo does not have to be empty: on first run, existing files
  inside games! are kept and pushed to the repo.


IMPORTANT - MAKE SURE RepoUrl IS CORRECT
----------------------------------------
The sync ONLY works if RepoUrl/Branch/Target point at the repo that
MonkeyCode actually pushes to. If you have more than one project,
open monkeycode-sync.ps1 and set RepoUrl to the exact repo you are
working on, e.g.:

  [string]$RepoUrl = "https://github.com/YOUR-NAME/YOUR-REPO.git"


REQUIREMENTS
------------
- Windows 10 Pro
- PowerShell 5.1 (built into Windows 10)
- Git for Windows (one-time install)
- Internet connection

====================================================================
