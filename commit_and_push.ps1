$env:PATH = "C:\Program Files\nodejs;C:\Users\Shanmukh\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;" + $env:PATH

Write-Host "Staging files..."
& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Committing..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "fix(venues): remove hardcoded Hyderabad location badge, display dynamic city or ALL LOCATIONS" --no-verify

Write-Host "Pushing to origin..."
& "C:\Program Files\Git\cmd\git.exe" push origin HEAD

Write-Host "Git push complete!"
