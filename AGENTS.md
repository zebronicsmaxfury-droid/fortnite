# Agent Instructions

## Auto-commit and push

After every change to any file (editing an existing file or creating a new file), you MUST commit and push the change to the remote so it syncs to the user's PC.

Steps after each change:

```
git add -A
git commit -m "<concise message describing the change>"
git push origin main
```

Do not wait for the user to ask. Do this every time a file is changed or created.
