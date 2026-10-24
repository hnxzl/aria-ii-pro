$ErrorActionPreference = 'Stop'
$base = 'C:\Users\Goolagoon\aria\analysis'
$dump = Join-Path $base 'dump-managed-il.ps1'
$tasks = @(
  @('Mouse_Drive_Beta.ComboControlLibrary.DPIControl','UpdateFlash','DPIControl.UpdateFlash'),
  @('Mouse_Drive_Beta.ComboControlLibrary.DPIControl','UpdateDPI','DPIControl.UpdateDPI'),
  @('Mouse_Drive_Beta.ComboControlLibrary.DPIControl','customComboBox_DPIGrade_OnSelectedIndexChanged','DPIControl.StageChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary.DPIControl','CustomDPIButton_ColorChange','DPIControl.ColorChange'),
  @('Mouse_Drive_Beta.ComboControlLibrary._2In1','UpdateFlash','TwoInOne.UpdateFlash'),
  @('Mouse_Drive_Beta.ComboControlLibrary._2In1','customRadioButton_ReportRateClick','TwoInOne.ReportRateClick'),
  @('Mouse_Drive_Beta.ComboControlLibrary._2In1','customComboBox_DPIEffect_OnSelectedIndexChanged','TwoInOne.DPIEffectChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._2In1','customTrackBar_DPIBrightness_ValueChanged','TwoInOne.BrightnessChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._2In1','customTrackBar_DPISpeed_ValueChanged','TwoInOne.SpeedChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','UpdateFlash','ThreeInOne.UpdateFlash'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customRadioButton_ReportRate_Click','ThreeInOne.ReportRateClick'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customComboBox_DPIEffect_OnSelectedIndexChanged','ThreeInOne.DPIEffectChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customTrackBar_DPIBrightness_ValueChanged','ThreeInOne.BrightnessChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customTrackBar_DPISpeed_ValueChanged','ThreeInOne.SpeedChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customComboBox_FullPerformance_OnSelectedIndexChanged','ThreeInOne.PeakDurationChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customComboBox_ModeSelect_OnSelectedIndexChanged','ThreeInOne.ModeSelectChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customComboBox_LOD_OnSelectedIndexChanged','ThreeInOne.LODChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customCheckBox_Ripple_CheckChange','ThreeInOne.RippleChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customCheckBox_FixLine_CheckChange','ThreeInOne.AngleSnapChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customCheckBox_MotionSync_CheckChange','ThreeInOne.MotionSyncChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','customCheckBox_FullPerformance_CheckChange','ThreeInOne.PeakChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','UpdateDPIEffect','ThreeInOne.UpdateDPIEffect'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','UpdateModeSelect','ThreeInOne.UpdateModeSelect'),
  @('Mouse_Drive_Beta.ComboControlLibrary._3In1','AddLODItems','ThreeInOne.AddLODItems'),
  @('Mouse_Drive_Beta.FormMain','Light_Color_Change','FormMain.LightColorChange'),
  @('Mouse_Drive_Beta.FormMain','customTrackBar_LightBrightness_ValueChanged','FormMain.LightBrightnessChanged'),
  @('Mouse_Drive_Beta.FormMain','customTrackBar_LightSpeed_ValueChanged','FormMain.LightSpeedChanged'),
  @('Mouse_Drive_Beta.FormMain','customCheckBox_MovingCloseLight_CheckChange','FormMain.MovingCloseLightChanged'),
  @('Mouse_Drive_Beta.FormMain','customComboBox_LEDMode_OnSelectedIndexChanged','FormMain.LEDModeChanged'),
  @('Mouse_Drive_Beta.FormMain','customComboBox_PowerSaveTime_OnSelectedIndexChanged','FormMain.SleepChanged'),
  @('Mouse_Drive_Beta.FormMain','FormAdvancedSetting_AdvancedChange','FormMain.AdvancedChanged'),
  @('Mouse_Drive_Beta.FormAdvancedSetting','DongleRGB_LEDChange','Advanced.DongleLEDChanged'),
  @('Mouse_Drive_Beta.FormAdvancedSetting','customCheckBox_LongRange_Click','Advanced.LongRangeChanged'),
  @('Mouse_Drive_Beta.FormMain','customComboBox_Config_OnSelectedIndexChanged','FormMain.ProfileChanged'),
  @('Mouse_Drive_Beta.ComboControlLibrary.CustomKeyFunction','UpdateFlash','CustomKeyFunction.UpdateFlash'),
  @('Mouse_Drive_Beta.ComboControlLibrary.CustomKeyFunction','UpdateMacro','CustomKeyFunction.UpdateMacro'),
  @('Mouse_Drive_Beta.ComboControlLibrary.CustomKeyFunction','Button_Click','CustomKeyFunction.ButtonClick'),
  @('DriverLib.UsbServer','Set4KDongleRGB','UsbServer.SetDongleRGB'),
  @('DriverLib.UsbServer','Get4KDongleRGBValue','UsbServer.GetDongleRGB'),
  @('DriverLib.UsbServer','SetLongRangeMode','UsbServer.SetLongRange'),
  @('DriverLib.UsbServer','GetLongRangeMode','UsbServer.GetLongRange'),
  @('DriverLib.UsbServer','ReadBatteryLevel','UsbServer.ReadBattery'),
  @('DriverLib.UsbServer','ReadDonglePairStatus','UsbServer.ReadPairStatus'),
  @('DriverLib.UsbServer','ReadVersion','UsbServer.ReadVersion'),
  @('DriverLib.DataParser','GetDeviceBatteryStatus','DataParser.BatteryStatus'),
  @('DriverLib.DataParser','ProtocolParser','DataParser.ProtocolParser')
  ,@('Mouse_Drive_Beta.ValueConvert','DPIIndexToBrightness','ValueConvert.DPIIndexToBrightness')
  ,@('Mouse_Drive_Beta.ValueConvert','DPIBrightnessToIndex','ValueConvert.DPIBrightnessToIndex')
  ,@('Mouse_Drive_Beta.ValueConvert','SetDPIEffect','ValueConvert.SetDPIEffect')
  ,@('Mouse_Drive_Beta.ValueConvert','SetLEDMode','ValueConvert.SetLEDMode')
  ,@('Mouse_Drive_Beta.ValueConvert','ComboxIndexToValue','ValueConvert.ComboxIndexToValue')
  ,@('Mouse_Drive_Beta.ValueConvert','ValueToComboxIndex','ValueConvert.ValueToComboxIndex')
  ,@('Mouse_Drive_Beta.ValueConvert','StructToInt','ValueConvert.StructToInt')
  ,@('Mouse_Drive_Beta.ValueConvert','IntToStruct','ValueConvert.IntToStruct')
  ,@('Mouse_Drive_Beta.ComboControlLibrary._3In1','UpdateValue','ThreeInOne.UpdateValue')
  ,@('Mouse_Drive_Beta.FormMain','UpdateDPIUI','FormMain.UpdateDPIUI')
  ,@('Mouse_Drive_Beta.FormMain','UpdateLightUI','FormMain.UpdateLightUI')
  ,@('Mouse_Drive_Beta.FormMain','UpdateLightModeUI','FormMain.UpdateLightModeUI')
  ,@('Mouse_Drive_Beta.FormMain','UpdateLEDPreview','FormMain.UpdateLEDPreview')
  ,@('Mouse_Drive_Beta.FormAdvancedSetting','DongleRGB_LEDChange','Advanced.DongleRGB_LEDChange')
  ,@('Mouse_Drive_Beta.FormAdvancedSetting','customCheckBox_LongRange_Click','Advanced.LongRange.Click')
  ,@('DriverLib.UsbServer','Set4KDongleRGB','UsbServer.SetDongleRGB')
  ,@('DriverLib.UsbServer','Get4KDongleRGBValue','UsbServer.GetDongleRGB')
  ,@('DriverLib.UsbServer','SetLongRangeMode','UsbServer.SetLongRange')
  ,@('DriverLib.UsbServer','GetLongRangeMode','UsbServer.GetLongRange')
  ,@('DriverLib.UsbServer','ReadBatteryLevel','UsbServer.ReadBattery')
  ,@('DriverLib.UsbServer','ReadDonglePairStatus','UsbServer.ReadPairStatus')
  ,@('DriverLib.DataParser','GetDeviceBatteryStatus','DataParser.BatteryStatus')
  ,@('DriverLib.DataParser','ProtocolParser','DataParser.ProtocolParser')
)
foreach ($task in $tasks) {
  $out = Join-Path $base ($task[2] + '.il.txt')
  & $dump -AssemblyPath 'C:\Program Files (x86)\Fantech Aria II Pro\Mouse Drive Beta.exe' -TypeName $task[0] -MethodName $task[1] -OutputPath $out | Out-Null
}
"Dumped $($tasks.Count) method bodies to $base"
