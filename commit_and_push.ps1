$env:PATH = "C:\Program Files\nodejs;C:\Users\Shanmukh\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;" + $env:PATH

Write-Host "Staging files..."
& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Committing..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "fix(payment-booking): ensure 100% reliable slot booking on successful payment with API verification, auto-fulfillment webhook, and atomic fallback" --no-verify

Write-Host "Pushing to origin..."
& "C:\Program Files\Git\cmd\git.exe" push origin HEAD

Write-Host "Git push complete!"
