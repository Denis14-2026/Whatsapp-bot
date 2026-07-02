if (Test-Path -Path .\auth) {
    Compress-Archive -Path .\auth -DestinationPath .\auth.zip -Force
    Write-Host "Created auth.zip - upload this file to your Railway persistent disk or extract it in the mounted volume."
} else {
    Write-Host "No auth\ folder found. Run the bot locally first to generate it by scanning the QR."
}
