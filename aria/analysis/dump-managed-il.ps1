param(
  [string]$AssemblyPath = 'C:\Program Files (x86)\Fantech Aria II Pro\Mouse Drive Beta.exe',
  [string]$TypeName = 'Mouse_Drive_Beta.ComboControlLibrary.DPIControl',
  [string]$MethodName = 'ValueToDPI',
  [string]$OutputPath = 'C:\Users\Goolagoon\aria\analysis\ValueToDPI.il.txt'
)
$ErrorActionPreference = 'Stop'
$resolveHandler = [ResolveEventHandler]{
  param($sender, $eventArgs)
  try { return [Reflection.Assembly]::ReflectionOnlyLoad($eventArgs.Name) }
  catch { return $null }
}
[AppDomain]::CurrentDomain.add_ReflectionOnlyAssemblyResolve($resolveHandler)
$asm = [Reflection.Assembly]::ReflectionOnlyLoadFrom($AssemblyPath)
$type = $asm.GetType($TypeName, $true, $false)
$method = $type.GetMethods([Reflection.BindingFlags]'Public,NonPublic,Instance,Static,DeclaredOnly') | Where-Object Name -eq $MethodName | Select-Object -First 1
if (-not $method) { throw "Method not found: $TypeName.$MethodName" }
$body = $method.GetMethodBody()
$bytes = $body.GetILAsByteArray()
$opmap = @{}
foreach ($f in [Reflection.Emit.OpCodes].GetFields([Reflection.BindingFlags]'Public,Static')) {
  $o = $f.GetValue($null)
  $opmap[([int]$o.Value -band 0xFFFF)] = $o
}
$lines = New-Object 'System.Collections.Generic.List[string]'
$lines.Add("ASSEMBLY=$AssemblyPath")
$lines.Add("TYPE=$TypeName METHOD=$MethodName TOKEN=0x$('{0:X8}' -f $method.MetadataToken) IL_BYTES=$($bytes.Length)")
$i = 0
while ($i -lt $bytes.Length) {
  $start = $i
  $op = [int]$bytes[$i]; $i++
  if ($op -eq 0xFE) { $op = (0xFE00 -bor [int]$bytes[$i]) -band 0xFFFF; $i++ }
  $code = $opmap[$op]
  if (-not $code) { $lines.Add(('{0:X4}: <unknown opcode {1:X4}>' -f $start,$op)); break }
  $operand = ''
  switch ($code.OperandType.ToString()) {
    'InlineNone' { }
    'ShortInlineI' { $v = [int]$bytes[$i]; if ($v -ge 128) { $v -= 256 }; $operand = [string]$v; $i++ }
    'InlineI' { $operand = [BitConverter]::ToInt32($bytes,$i).ToString(); $i += 4 }
    'InlineI8' { $operand = [BitConverter]::ToInt64($bytes,$i).ToString(); $i += 8 }
    'ShortInlineR' { $operand = [BitConverter]::ToSingle($bytes,$i).ToString('R'); $i += 4 }
    'InlineR' { $operand = [BitConverter]::ToDouble($bytes,$i).ToString('R'); $i += 8 }
    'ShortInlineVar' { $operand = [string][int]$bytes[$i]; $i++ }
    'InlineVar' { $operand = [BitConverter]::ToUInt16($bytes,$i).ToString(); $i += 2 }
    'ShortInlineBrTarget' { $delta = [int]$bytes[$i]; if ($delta -ge 128) { $delta -= 256 }; $i++; $operand = ('IL_{0:X4}' -f ($i + $delta)) }
    'InlineBrTarget' { $delta = [BitConverter]::ToInt32($bytes,$i); $i += 4; $operand = ('IL_{0:X4}' -f ($i + $delta)) }
    'InlineSwitch' { $n = [BitConverter]::ToInt32($bytes,$i); $i += 4; $base = $i + (4 * $n); $targets = @(); for ($k=0; $k -lt $n; $k++) { $d = [BitConverter]::ToInt32($bytes,$i); $i += 4; $targets += ('IL_{0:X4}' -f ($base + $d)) }; $operand = ($targets -join ', ') }
    { $_ -in 'InlineString','InlineMethod','InlineField','InlineType','InlineTok','InlineSig' } {
      $tok = [BitConverter]::ToInt32($bytes,$i); $i += 4
      $operand = ('0x{0:X8}' -f $tok)
      try {
        if ($code.OperandType.ToString() -eq 'InlineString') { $operand += ' // ' + $asm.ManifestModule.ResolveString($tok) }
        elseif ($code.OperandType.ToString() -ne 'InlineSig') { $operand += ' // ' + $asm.ManifestModule.ResolveMember($tok).ToString() }
      } catch { $operand += ' // <unresolved>' }
    }
    default { $operand = '<unsupported ' + $code.OperandType + '>' }
  }
  $lines.Add(('{0:X4}: {1,-16} {2}' -f $start,$code.Name,$operand).TrimEnd())
}
Set-Content -LiteralPath $OutputPath -Value $lines -Encoding UTF8
Get-Content -LiteralPath $OutputPath
