$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.ComponentModel;
public static class VibeCredentialVault {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct Credential {
    public uint Flags, Type;
    public string TargetName, Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist, AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias, UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredWrite(ref Credential value, uint flags);
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredRead(string target, uint type, uint flags, out IntPtr ptr);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern bool CredDelete(string target, uint type, uint flags);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr ptr);
  public static void Write(string target, string secret) {
    byte[] bytes = System.Text.Encoding.UTF8.GetBytes(secret);
    if(bytes.Length > 2400) throw new InvalidOperationException("Credential too large.");
    IntPtr buffer=Marshal.AllocHGlobal(bytes.Length);
    try {
      Marshal.Copy(bytes,0,buffer,bytes.Length);
      Credential value=new Credential { Type=1, TargetName=target, UserName="VibeScroller device", CredentialBlobSize=(uint)bytes.Length, CredentialBlob=buffer, Persist=2 };
      if(!CredWrite(ref value,0)) throw new Win32Exception(Marshal.GetLastWin32Error());
    } finally { for(int i=0;i<bytes.Length;i++) Marshal.WriteByte(buffer,i,0); Marshal.FreeHGlobal(buffer); Array.Clear(bytes,0,bytes.Length); }
  }
  public static string Read(string target) {
    IntPtr ptr;
    if(!CredRead(target,1,0,out ptr)) { if(Marshal.GetLastWin32Error()==1168) return null; throw new Win32Exception(Marshal.GetLastWin32Error()); }
    try { Credential value=Marshal.PtrToStructure<Credential>(ptr); byte[] bytes=new byte[value.CredentialBlobSize]; Marshal.Copy(value.CredentialBlob,bytes,0,bytes.Length); string result=System.Text.Encoding.UTF8.GetString(bytes); Array.Clear(bytes,0,bytes.Length); return result; }
    finally { CredFree(ptr); }
  }
  public static void Delete(string target) { if(!CredDelete(target,1,0) && Marshal.GetLastWin32Error()!=1168) throw new Win32Exception(Marshal.GetLastWin32Error()); }
}
"@
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($request.target -notmatch '^VibeScroller/[a-zA-Z0-9_-]{8,100}$') { throw 'Invalid credential target.' }
switch ($request.operation) {
  'write' { [VibeCredentialVault]::Write($request.target, $request.secret); @{ok=$true} | ConvertTo-Json -Compress }
  'read' { @{secret=[VibeCredentialVault]::Read($request.target)} | ConvertTo-Json -Compress }
  'delete' { [VibeCredentialVault]::Delete($request.target); @{ok=$true} | ConvertTo-Json -Compress }
  default { throw 'Unsupported credential operation.' }
}
