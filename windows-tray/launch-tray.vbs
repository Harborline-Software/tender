Dim scriptDir, cmd
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
cmd = "powershell.exe -STA -NoProfile -WindowStyle Hidden -File """ & scriptDir & "tender-tray.ps1"""
CreateObject("WScript.Shell").Run cmd, 0, False
