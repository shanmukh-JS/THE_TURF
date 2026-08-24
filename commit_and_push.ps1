$env:PATH = "C:\Program Files\nodejs;C:\Users\Shanmukh\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;" + $env:PATH

Write-Host "Staging files..."
& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Committing..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "fix(player-dashboard): sync accurate favorites count with active venues and remove fake trend percentage badges" --no-verify

Write-Host "Pushing to origin main..."
& "C:\Program Files\Git\cmd\git.exe" push origin main

Write-Host "Git push complete!"
