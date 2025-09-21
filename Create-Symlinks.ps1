<#
.SYNOPSIS
    Automates the creation of symbolic links for development folders.
.DESCRIPTION
    This script prompts the user for a main source directory and a main destination
    directory. It then enters a loop, asking for individual subfolder names to link
    from the source to the destination.
.NOTES
    IMPORTANT: This script MUST be run with Administrator privileges to have the
    permissions needed to create symbolic links.
#>

# Clear the screen for a clean start
Clear-Host

# Display a title and instructions for the user
Write-Host "--- Interactive Symbolic Link Creator ---" -ForegroundColor Yellow
Write-Host "This script will help you create symbolic links for your modules."
Write-Host "IMPORTANT: Please ensure you are running this script as an Administrator." -ForegroundColor Red
Write-Host "" # Add a blank line for spacing

# --- Get Base Paths from User ---

# Prompt for the source (GitHub) directory and store it in a variable
$sourceBase = Read-Host -Prompt "Enter your source GitHub folder path (e.g., C:\Users\Joana\Documents\GitHub)"

# Prompt for the destination (modules) directory and store it in a variable
$destBase = Read-Host -Prompt "Enter your destination modules folder path (e.g., C:\Users\Joana\AppData\Local\FoundryVTT\Data\modules)"

# --- Main Loop to Create Links ---

# Start an infinite loop that we will break out of manually
while ($true) {
    Write-Host "" # Add a blank line for readability
    # Ask the user for the specific module folder name
    $moduleName = Read-Host -Prompt "Enter the module folder name to link (or press Enter to quit)"

    # If the user just presses Enter (input is empty), exit the loop
    if ([string]::IsNullOrWhiteSpace($moduleName)) {
        break
    }

    # --- Construct and Validate Paths ---

    # Build the full paths using the PowerShell-safe Join-Path command
    $fullSourcePath = Join-Path -Path $sourceBase -ChildPath $moduleName
    $fullDestPath   = Join-Path -Path $destBase   -ChildPath $moduleName

    # Check 1: Does the source folder actually exist?
    if (-not (Test-Path -Path $fullSourcePath)) {
        Write-Warning "Source folder not found at '$fullSourcePath'. Please check the name. Skipping."
        continue # Skip to the next loop iteration
    }

    # Check 2: Does a folder or link already exist at the destination?
    if (Test-Path -Path $fullDestPath) {
        Write-Warning "An item already exists at the destination '$fullDestPath'. Skipping."
        continue # Skip to the next loop iteration
    }

    # --- Create the Link ---

    # Use a try/catch block for robust error handling
    try {
        # Create the symbolic link. -ErrorAction Stop ensures that if it fails, the 'catch' block will run.
        New-Item -ItemType SymbolicLink -Path $fullDestPath -Value $fullSourcePath -ErrorAction Stop
        Write-Host "✅ Successfully created link for '$moduleName'." -ForegroundColor Green
    }
    catch {
        # If any error occurred, display a user-friendly message
        Write-Error "❌ Failed to create link for '$moduleName'. The error was: $($_.Exception.Message)"
    }
}

Write-Host "" # Add a blank line
Write-Host "--- Script finished. ---" -ForegroundColor Yellow