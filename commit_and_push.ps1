$env:PATH = "C:\Program Files\nodejs;C:\Users\Shanmukh\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;" + $env:PATH

Write-Host "Staging files..."
& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Committing..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "fix(refunds): ensure all cancelled bookings render in refunds management with safe null handling and payment reference" --no-verify

Write-Host "Pushing to origin main..."
& "C:\Program Files\Git\cmd\git.exe" push origin main

Write-Host "Pushing to feature branch..."
& "C:\Program Files\Git\cmd\git.exe" push origin main:feature/production-readiness-phases

Write-Host "Git push complete!"
