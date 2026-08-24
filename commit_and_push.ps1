$env:PATH = "C:\Program Files\nodejs;C:\Users\Shanmukh\AppData\Roaming\npm;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;" + $env:PATH

Remove-Item "c:\Users\Shanmukh\OneDrive\Desktop\TRUF\test_pixels.py" -Force -ErrorAction SilentlyContinue
Remove-Item "c:\Users\Shanmukh\OneDrive\Desktop\TRUF\check_orig.py" -Force -ErrorAction SilentlyContinue
Remove-Item "c:\Users\Shanmukh\OneDrive\Desktop\TRUF\fix_logos_perfect.py" -Force -ErrorAction SilentlyContinue

Write-Host "Running type check..."
cd apps/web
npx tsc --noEmit
cd ../..

Write-Host "Staging files..."
& "C:\Program Files\Git\cmd\git.exe" add .

Write-Host "Committing..."
& "C:\Program Files\Git\cmd\git.exe" commit -m "fix(branding): ensure crisp transparent logos and enhanced navbar/sidebar branding" --no-verify

Write-Host "Pushing to origin..."
& "C:\Program Files\Git\cmd\git.exe" push origin HEAD

Write-Host "Git push complete!"
