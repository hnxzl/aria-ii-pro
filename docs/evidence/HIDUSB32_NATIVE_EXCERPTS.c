/* Ghidra 11.4.2 headless decompilation of HIDUsb32.dll (Costura-embedded copy,
   SHA-256 09bb39ac086ddba379fcb9caf4bae88afb3033117075af9c8fbba4a6ee6720fc, from aria/ghidra manual/costura32.hidusb32.dll).
   Produced 2026-10-23 in a scratch copy; the original DLL and the existing Ghidra projects were not modified.
   Only functions cited by docs/EVIDENCE_LEDGER.md are included. Addresses are image addresses (base 0x10000000). */
//==== FUN_1000c190 @ 1000c190

undefined4 __fastcall FUN_1000c190(uint param_1,int param_2,int param_3)

{
  char *pcVar1;
  uint uVar2;
  undefined3 uVar3;
  ushort uVar4;
  undefined1 in_XMM1_Ba;
  char cVar6;
  undefined1 in_XMM1_Bb;
  char cVar7;
  undefined1 in_XMM1_Bc;
  char cVar8;
  undefined1 in_XMM1_Bd;
  char cVar9;
  undefined1 in_XMM1_Be;
  char cVar10;
  undefined1 in_XMM1_Bf;
  char cVar11;
  undefined1 in_XMM1_Bg;
  char cVar12;
  undefined1 in_XMM1_Bh;
  char cVar13;
  undefined1 in_XMM1_Bi;
  char cVar14;
  undefined1 in_XMM1_Bj;
  char cVar15;
  undefined1 in_XMM1_Bk;
  char cVar16;
  undefined1 in_XMM1_Bl;
  char cVar17;
  undefined1 in_XMM1_Bm;
  char cVar18;
  undefined1 in_XMM1_Bn;
  char cVar19;
  undefined1 in_XMM1_Bo;
  char cVar20;
  undefined1 in_XMM1_Bp;
  char cVar21;
  char cVar22;
  char cVar24;
  char cVar25;
  undefined4 uVar23;
  char cVar26;
  char cVar27;
  char cVar29;
  char cVar30;
  undefined4 uVar28;
  char cVar31;
  char cVar32;
  char cVar34;
  char cVar35;
  undefined4 uVar33;
  char cVar36;
  char cVar37;
  char cVar39;
  char cVar40;
  undefined4 uVar38;
  char cVar41;
  uint local_8;
  uint uVar5;
  
  uVar2 = param_3 - param_2;
  local_8 = param_1 & 0xffffff00;
  if ((param_2 < param_3) && (0x1f < uVar2)) {
    uVar2 = uVar2 & 0x8000001f;
    if ((int)uVar2 < 0) {
      uVar2 = (uVar2 - 1 | 0xffffffe0) + 1;
    }
    uVar23 = 0;
    uVar28 = 0;
    uVar33 = 0;
    uVar38 = 0;
    uVar5 = CONCAT13(in_XMM1_Bd,CONCAT12(in_XMM1_Bc,CONCAT11(in_XMM1_Bb,in_XMM1_Ba))) ^
            CONCAT13(in_XMM1_Bd,CONCAT12(in_XMM1_Bc,CONCAT11(in_XMM1_Bb,in_XMM1_Ba)));
    cVar6 = (char)uVar5;
    cVar7 = (char)(uVar5 >> 8);
    cVar8 = (char)(uVar5 >> 0x10);
    cVar9 = (char)(uVar5 >> 0x18);
    uVar5 = CONCAT13(in_XMM1_Bh,CONCAT12(in_XMM1_Bg,CONCAT11(in_XMM1_Bf,in_XMM1_Be))) ^
            CONCAT13(in_XMM1_Bh,CONCAT12(in_XMM1_Bg,CONCAT11(in_XMM1_Bf,in_XMM1_Be)));
    cVar10 = (char)uVar5;
    cVar11 = (char)(uVar5 >> 8);
    cVar12 = (char)(uVar5 >> 0x10);
    cVar13 = (char)(uVar5 >> 0x18);
    uVar5 = CONCAT13(in_XMM1_Bl,CONCAT12(in_XMM1_Bk,CONCAT11(in_XMM1_Bj,in_XMM1_Bi))) ^
            CONCAT13(in_XMM1_Bl,CONCAT12(in_XMM1_Bk,CONCAT11(in_XMM1_Bj,in_XMM1_Bi)));
    cVar14 = (char)uVar5;
    cVar15 = (char)(uVar5 >> 8);
    cVar16 = (char)(uVar5 >> 0x10);
    cVar17 = (char)(uVar5 >> 0x18);
    uVar5 = CONCAT13(in_XMM1_Bp,CONCAT12(in_XMM1_Bo,CONCAT11(in_XMM1_Bn,in_XMM1_Bm))) ^
            CONCAT13(in_XMM1_Bp,CONCAT12(in_XMM1_Bo,CONCAT11(in_XMM1_Bn,in_XMM1_Bm)));
    cVar18 = (char)uVar5;
    cVar19 = (char)(uVar5 >> 8);
    cVar20 = (char)(uVar5 >> 0x10);
    cVar21 = (char)(uVar5 >> 0x18);
    do {
      pcVar1 = (char *)(param_2 + param_1);
      cVar22 = (char)uVar23 + *pcVar1;
      cVar24 = (char)((uint)uVar23 >> 8) + pcVar1[1];
      cVar25 = (char)((uint)uVar23 >> 0x10) + pcVar1[2];
      cVar26 = (char)((uint)uVar23 >> 0x18) + pcVar1[3];
      uVar23 = CONCAT13(cVar26,CONCAT12(cVar25,CONCAT11(cVar24,cVar22)));
      cVar27 = (char)uVar28 + pcVar1[4];
      cVar29 = (char)((uint)uVar28 >> 8) + pcVar1[5];
      cVar30 = (char)((uint)uVar28 >> 0x10) + pcVar1[6];
      cVar31 = (char)((uint)uVar28 >> 0x18) + pcVar1[7];
      uVar28 = CONCAT13(cVar31,CONCAT12(cVar30,CONCAT11(cVar29,cVar27)));
      cVar32 = (char)uVar33 + pcVar1[8];
      cVar34 = (char)((uint)uVar33 >> 8) + pcVar1[9];
      cVar35 = (char)((uint)uVar33 >> 0x10) + pcVar1[10];
      cVar36 = (char)((uint)uVar33 >> 0x18) + pcVar1[0xb];
      uVar33 = CONCAT13(cVar36,CONCAT12(cVar35,CONCAT11(cVar34,cVar32)));
      cVar37 = (char)uVar38 + pcVar1[0xc];
      cVar39 = (char)((uint)uVar38 >> 8) + pcVar1[0xd];
      cVar40 = (char)((uint)uVar38 >> 0x10) + pcVar1[0xe];
      cVar41 = (char)((uint)uVar38 >> 0x18) + pcVar1[0xf];
      uVar38 = CONCAT13(cVar41,CONCAT12(cVar40,CONCAT11(cVar39,cVar37)));
      pcVar1 = (char *)(param_2 + 0x10 + param_1);
      param_2 = param_2 + 0x20;
      cVar6 = cVar6 + *pcVar1;
      cVar7 = cVar7 + pcVar1[1];
      cVar8 = cVar8 + pcVar1[2];
      cVar9 = cVar9 + pcVar1[3];
      cVar10 = cVar10 + pcVar1[4];
      cVar11 = cVar11 + pcVar1[5];
      cVar12 = cVar12 + pcVar1[6];
      cVar13 = cVar13 + pcVar1[7];
      cVar14 = cVar14 + pcVar1[8];
      cVar15 = cVar15 + pcVar1[9];
      cVar16 = cVar16 + pcVar1[10];
      cVar17 = cVar17 + pcVar1[0xb];
      cVar18 = cVar18 + pcVar1[0xc];
      cVar19 = cVar19 + pcVar1[0xd];
      cVar20 = cVar20 + pcVar1[0xe];
      cVar21 = cVar21 + pcVar1[0xf];
    } while (param_2 < (int)(param_3 - uVar2));
    cVar14 = cVar14 + cVar32;
    cVar15 = cVar15 + cVar34;
    cVar16 = cVar16 + cVar35;
    cVar18 = cVar10 + cVar27 + cVar18 + cVar37;
    cVar19 = cVar11 + cVar29 + cVar19 + cVar39;
    cVar12 = cVar12 + cVar30 + cVar20 + cVar40;
    cVar8 = cVar8 + cVar25 + cVar16 + cVar12;
    cVar10 = cVar9 + cVar26 + cVar17 + cVar36 + cVar13 + cVar31 + cVar21 + cVar41;
    cVar11 = cVar18 + cVar14;
    cVar7 = cVar7 + cVar24 + cVar15 + cVar19 + cVar10;
    cVar9 = cVar8 + cVar11;
    cVar10 = cVar10 + cVar19 + cVar15;
    local_8 = CONCAT13(cVar10 + cVar11 + cVar12 + cVar16,
                       CONCAT12(cVar9 + cVar10,
                                CONCAT11(cVar7 + cVar9,
                                         cVar6 + cVar22 + cVar14 + cVar18 + cVar8 + cVar7)));
  }
  uVar5 = 0;
  uVar4 = 0;
  if (param_2 < param_3) {
    uVar3 = (undefined3)(local_8 >> 8);
    if (1 < param_3 - param_2) {
      do {
        cVar7 = (char)(uVar5 >> 8) + *(char *)(param_2 + param_1);
        cVar6 = (char)uVar5 + *(char *)(param_2 + 1 + param_1);
        uVar4 = CONCAT11(cVar7,cVar6);
        uVar5 = (uint)uVar4;
        param_2 = param_2 + 2;
      } while (param_2 < param_3 + -1);
      if (param_3 <= param_2) {
        uVar2 = CONCAT31(uVar3,(char)local_8 + cVar6 + cVar7);
        local_8 = uVar2;
        goto LAB_1000c25d;
      }
    }
    return CONCAT31(uVar3,'U' - ((char)local_8 + *(char *)(param_2 + param_1) +
                                (char)uVar4 + (char)(uVar4 >> 8)));
  }
LAB_1000c25d:
  return CONCAT31((int3)(uVar2 >> 8),'U' - (char)local_8);
}


//==== CS_GetDeviceInfo @ 10006420

void __cdecl CS_GetDeviceInfo(int param_1,undefined1 *param_2)

{
                    /* 0x6420  10  CS_GetDeviceInfo
                       0x6420  97  GetDeviceInfo */
  *param_2 = *(undefined1 *)(param_1 + 4);
  param_2[1] = *(undefined1 *)(param_1 + 5);
  param_2[2] = *(undefined1 *)(param_1 + 6);
  return;
}


//==== CS_isDeviceOnLine @ 10006440

bool __cdecl CS_isDeviceOnLine(char *param_1)

{
                    /* 0x6440  95  CS_isDeviceOnLine
                       0x6440  207  isDeviceOnLine */
  return *param_1 != '\0';
}


//==== CS_GetDeviceBatteryStatus @ 10006450

void __cdecl CS_GetDeviceBatteryStatus(undefined1 *param_1,undefined1 *param_2)

{
                    /* 0x6450  9  CS_GetDeviceBatteryStatus
                       0x6450  96  GetDeviceBatteryStatus */
  *param_2 = *param_1;
  param_2[1] = param_1[1];
  *(ushort *)(param_2 + 2) = CONCAT11(param_1[2],param_1[3]);
  return;
}


//==== CS_GetDeviceStatusChanged @ 10006480

void __cdecl CS_GetDeviceStatusChanged(byte *param_1,byte *param_2)

{
                    /* 0x6480  11  CS_GetDeviceStatusChanged
                       0x6480  98  GetDeviceStatusChanged */
  *param_2 = *param_1 & 1;
  param_2[1] = *param_1 >> 1 & 1;
  param_2[2] = *param_1 >> 2 & 1;
  param_2[3] = *param_1 >> 3 & 1;
  param_2[4] = *param_1 >> 4 & 1;
  param_2[5] = *param_1 >> 5 & 1;
  param_2[6] = *param_1 >> 6 & 1;
  return;
}


//==== CS_GetDeviceVersion @ 100064e0

undefined2 __cdecl CS_GetDeviceVersion(undefined1 *param_1)

{
                    /* 0x64e0  12  CS_GetDeviceVersion
                       0x64e0  99  GetDeviceVersion */
  return CONCAT11(*param_1,param_1[1]);
}


//==== MouseConfigParser @ 10006500

void __cdecl MouseConfigParser(uint param_1,undefined1 *param_2)

{
  undefined4 uVar1;
  undefined1 *extraout_ECX;
  uint extraout_ECX_00;
  uint extraout_ECX_01;
  uint extraout_ECX_02;
  uint extraout_ECX_03;
  uint extraout_ECX_04;
  uint extraout_ECX_05;
  uint extraout_ECX_06;
  uint extraout_ECX_07;
  uint extraout_ECX_08;
  uint extraout_ECX_09;
  uint extraout_ECX_10;
  uint extraout_ECX_11;
  uint extraout_ECX_12;
  int extraout_ECX_13;
  byte bVar2;
  
                    /* 0x6500  101  MouseConfigParser */
  *param_2 = 1;
  uVar1 = FUN_1000c190(param_1,0,1);
  if (extraout_ECX[1] == (char)uVar1) {
    *param_2 = *extraout_ECX;
  }
  param_2[1] = 6;
  bVar2 = 6;
  uVar1 = FUN_1000c190((uint)extraout_ECX,2,3);
  if (*(char *)(extraout_ECX_00 + 3) == (char)uVar1) {
    bVar2 = *(byte *)(extraout_ECX_00 + 2);
    param_2[1] = bVar2;
  }
  param_2[2] = 2;
  uVar1 = FUN_1000c190(extraout_ECX_00,4,5);
  if ((*(char *)(extraout_ECX_01 + 5) == (char)uVar1) && (*(byte *)(extraout_ECX_01 + 4) < bVar2)) {
    param_2[2] = *(byte *)(extraout_ECX_01 + 4);
  }
  param_2[3] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_01,6,7);
  if (*(char *)(extraout_ECX_02 + 7) == (char)uVar1) {
    param_2[3] = *(undefined1 *)(extraout_ECX_02 + 6);
  }
  param_2[4] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_02,8,9);
  if (*(char *)(extraout_ECX_03 + 9) == (char)uVar1) {
    param_2[4] = *(undefined1 *)(extraout_ECX_03 + 8);
  }
  param_2[5] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_03,10,0xb);
  if (*(char *)(extraout_ECX_04 + 0xb) == (char)uVar1) {
    param_2[5] = *(undefined1 *)(extraout_ECX_04 + 10);
  }
  param_2[6] = 8;
  uVar1 = FUN_1000c190(extraout_ECX_04,0xa9,0xaa);
  if (*(char *)(extraout_ECX_05 + 0xaa) == (char)uVar1) {
    param_2[6] = *(undefined1 *)(extraout_ECX_05 + 0xa9);
  }
  param_2[7] = 1;
  uVar1 = FUN_1000c190(extraout_ECX_05,0xab,0xac);
  if (*(char *)(extraout_ECX_06 + 0xac) == (char)uVar1) {
    param_2[7] = *(char *)(extraout_ECX_06 + 0xab) != '\0';
  }
  param_2[8] = 6;
  uVar1 = FUN_1000c190(extraout_ECX_06,0xad,0xae);
  if (*(char *)(extraout_ECX_07 + 0xae) == (char)uVar1) {
    param_2[8] = *(undefined1 *)(extraout_ECX_07 + 0xad);
  }
  param_2[9] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_07,0xaf,0xb0);
  if (*(char *)(extraout_ECX_08 + 0xb0) == (char)uVar1) {
    param_2[9] = *(char *)(extraout_ECX_08 + 0xaf) != '\0';
  }
  param_2[10] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_08,0xb1,0xb2);
  if (*(char *)(extraout_ECX_09 + 0xb2) == (char)uVar1) {
    param_2[10] = *(char *)(extraout_ECX_09 + 0xb1) != '\0';
  }
  param_2[0xb] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_09,0xb3,0xb4);
  if (*(char *)(extraout_ECX_10 + 0xb4) == (char)uVar1) {
    param_2[0xb] = *(char *)(extraout_ECX_10 + 0xb3) != '\0';
  }
  param_2[0xc] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_10,0xb5,0xb6);
  if (*(char *)(extraout_ECX_11 + 0xb6) == (char)uVar1) {
    param_2[0xc] = *(char *)(extraout_ECX_11 + 0xb5) != '\0';
  }
  param_2[0xd] = 6;
  uVar1 = FUN_1000c190(extraout_ECX_11,0xb7,0xb8);
  if (*(char *)(extraout_ECX_12 + 0xb8) == (char)uVar1) {
    param_2[0xd] = *(undefined1 *)(extraout_ECX_12 + 0xb7);
  }
  param_2[0xe] = 0;
  uVar1 = FUN_1000c190(extraout_ECX_12,0xb9,0xba);
  if (*(char *)(extraout_ECX_13 + 0xba) == (char)uVar1) {
    param_2[0xe] = *(undefined1 *)(extraout_ECX_13 + 0xb9);
  }
  return;
}


//==== BufferToDPIColor @ 10006740

void __cdecl BufferToDPIColor(uint param_1,int param_2)

{
  undefined4 uVar1;
  undefined1 *extraout_ECX;
  
                    /* 0x6740  1  BufferToDPIColor */
  *(undefined2 *)(param_2 + 3) = 0xffff;
  *(undefined1 *)(param_2 + 5) = 0xff;
  uVar1 = FUN_1000c190(param_1,0,3);
  if (extraout_ECX[3] == (char)uVar1) {
    *(undefined1 *)(param_2 + 3) = *extraout_ECX;
    *(undefined1 *)(param_2 + 4) = extraout_ECX[1];
    *(undefined1 *)(param_2 + 5) = extraout_ECX[2];
  }
  return;
}


//==== BufferToDPILed @ 10006780

void __cdecl BufferToDPILed(uint param_1,undefined1 *param_2)

{
  undefined4 uVar1;
  undefined1 *extraout_ECX;
  uint extraout_ECX_00;
  uint extraout_ECX_01;
  int extraout_ECX_02;
  
                    /* 0x6780  2  BufferToDPILed */
  *param_2 = 2;
  uVar1 = FUN_1000c190(param_1,0,1);
  if (extraout_ECX[1] == (char)uVar1) {
    *param_2 = *extraout_ECX;
  }
  param_2[1] = 0x80;
  uVar1 = FUN_1000c190((uint)extraout_ECX,2,3);
  if (*(char *)(extraout_ECX_00 + 3) == (char)uVar1) {
    param_2[1] = *(undefined1 *)(extraout_ECX_00 + 2);
  }
  param_2[2] = 3;
  uVar1 = FUN_1000c190(extraout_ECX_00,4,5);
  if (*(char *)(extraout_ECX_01 + 5) == (char)uVar1) {
    param_2[2] = *(undefined1 *)(extraout_ECX_01 + 4);
  }
  param_2[3] = 1;
  uVar1 = FUN_1000c190(extraout_ECX_01,6,7);
  if (*(char *)(extraout_ECX_02 + 7) == (char)uVar1) {
    param_2[3] = *(undefined1 *)(extraout_ECX_02 + 6);
  }
  return;
}


//==== BufferToLedBar @ 10006810

void __cdecl BufferToLedBar(uint param_1,undefined4 *param_2)

{
  undefined4 uVar1;
  undefined1 *extraout_ECX;
  int extraout_ECX_00;
  
                    /* 0x6810  4  BufferToLedBar */
  *param_2 = 0xffffff01;
  *(undefined2 *)(param_2 + 1) = 0x908;
  uVar1 = FUN_1000c190(param_1,0,6);
  if (extraout_ECX[6] == (char)uVar1) {
    *(undefined1 *)param_2 = *extraout_ECX;
    *(undefined1 *)((int)param_2 + 1) = extraout_ECX[1];
    *(undefined1 *)((int)param_2 + 2) = extraout_ECX[2];
    *(undefined1 *)((int)param_2 + 3) = extraout_ECX[3];
    *(undefined1 *)(param_2 + 1) = extraout_ECX[4];
    *(undefined1 *)((int)param_2 + 5) = extraout_ECX[5];
  }
  *(undefined1 *)((int)param_2 + 6) = 1;
  uVar1 = FUN_1000c190((uint)extraout_ECX,7,8);
  if (*(char *)(extraout_ECX_00 + 8) == (char)uVar1) {
    *(undefined1 *)((int)param_2 + 6) = *(undefined1 *)(extraout_ECX_00 + 7);
  }
  return;
}


//==== BufferToKeyFunMap @ 10006890

void __cdecl BufferToKeyFunMap(uint param_1,undefined2 *param_2)

{
  undefined4 uVar1;
  undefined1 *extraout_ECX;
  
                    /* 0x6890  3  BufferToKeyFunMap */
  *param_2 = 0;
  *(undefined1 *)(param_2 + 1) = 0;
  uVar1 = FUN_1000c190(param_1,0,3);
  if (extraout_ECX[3] == (char)uVar1) {
    *(undefined1 *)param_2 = *extraout_ECX;
    *(undefined1 *)((int)param_2 + 1) = extraout_ECX[1];
    *(undefined1 *)(param_2 + 1) = extraout_ECX[2];
  }
  return;
}


//==== ProtocolDataParser @ 100068d0

void __cdecl ProtocolDataParser(byte *param_1,byte *param_2)

{
  byte *pbVar1;
  undefined4 uVar2;
  byte *extraout_ECX;
  byte *extraout_ECX_00;
  uint extraout_ECX_01;
  uint extraout_ECX_02;
  int extraout_ECX_03;
  byte *extraout_ECX_04;
  int extraout_ECX_05;
  int iVar3;
  byte *pbVar4;
  byte *pbVar5;
  byte *pbVar6;
  int local_c;
  byte *local_8;
  
                    /* 0x68d0  102  ProtocolDataParser */
  DAT_1001e880 = 1;
  MouseConfigParser((uint)param_1,param_2);
  pbVar5 = param_2 + 0x11;
  pbVar6 = param_1 + 0xc;
  iVar3 = 8;
  do {
    pbVar5[-0xffffffff00000002] = 0xff;
    pbVar5[-0xffffffff00000001] = 0xff;
    *pbVar5 = 0;
    uVar2 = FUN_1000c190((uint)pbVar6,0,3);
    if (pbVar6[3] == (byte)uVar2) {
      pbVar5[-2] = *pbVar6;
      pbVar5[-1] = pbVar6[1];
      *pbVar5 = pbVar6[2];
    }
    pbVar5[1] = 0xff;
    pbVar5[2] = 0xff;
    pbVar5[3] = 0xff;
    uVar2 = FUN_1000c190((uint)(pbVar6 + 0x20),0,3);
    if (pbVar6[0x23] == (byte)uVar2) {
      pbVar5[1] = *extraout_ECX;
      pbVar5[2] = pbVar6[0x21];
      pbVar5[3] = pbVar6[0x22];
    }
    pbVar5 = pbVar5 + 6;
    pbVar6 = pbVar6 + 4;
    iVar3 = iVar3 + -1;
  } while (iVar3 != 0);
  param_2[0x3f] = 2;
  uVar2 = FUN_1000c190((uint)(param_1 + 0x4c),0,1);
  if (extraout_ECX_00[1] == (byte)uVar2) {
    param_2[0x3f] = *extraout_ECX_00;
  }
  param_2[0x40] = 0x80;
  uVar2 = FUN_1000c190((uint)extraout_ECX_00,2,3);
  if (*(char *)(extraout_ECX_01 + 3) == (char)uVar2) {
    param_2[0x40] = *(byte *)(extraout_ECX_01 + 2);
  }
  param_2[0x41] = 3;
  uVar2 = FUN_1000c190(extraout_ECX_01,4,5);
  if (*(char *)(extraout_ECX_02 + 5) == (char)uVar2) {
    param_2[0x41] = *(byte *)(extraout_ECX_02 + 4);
  }
  param_2[0x42] = 1;
  uVar2 = FUN_1000c190(extraout_ECX_02,6,7);
  if (*(char *)(extraout_ECX_03 + 7) == (char)uVar2) {
    param_2[0x42] = *(byte *)(extraout_ECX_03 + 6);
  }
  param_2[0x43] = 1;
  param_2[0x44] = 0xff;
  param_2[0x45] = 0xff;
  param_2[0x46] = 0xff;
  param_2[0x47] = 8;
  param_2[0x48] = 9;
  uVar2 = FUN_1000c190((uint)(param_1 + 0xa0),0,6);
  if (extraout_ECX_04[6] == (byte)uVar2) {
    param_2[0x43] = *extraout_ECX_04;
    param_2[0x44] = extraout_ECX_04[1];
    param_2[0x45] = extraout_ECX_04[2];
    param_2[0x46] = extraout_ECX_04[3];
    param_2[0x47] = extraout_ECX_04[4];
    param_2[0x48] = extraout_ECX_04[5];
  }
  param_2[0x49] = 1;
  uVar2 = FUN_1000c190((uint)extraout_ECX_04,7,8);
  if (*(char *)(extraout_ECX_05 + 8) == (char)uVar2) {
    param_2[0x49] = *(byte *)(extraout_ECX_05 + 7);
  }
  pbVar4 = param_1 + 0x300;
  local_c = 0x10;
  pbVar5 = param_1 + 0x60;
  local_8 = param_2 + 0x3bc;
  pbVar1 = param_1 + 0x100;
  pbVar6 = param_2 + 0x4c;
  param_1 = param_2 + 0x7c;
  param_2 = pbVar1;
  do {
    pbVar6[-0xffffffff00000002] = 0;
    pbVar6[-0xffffffff00000001] = 0;
    *pbVar6 = 0;
    uVar2 = FUN_1000c190((uint)pbVar5,0,3);
    if (pbVar5[3] == (byte)uVar2) {
      pbVar6[-2] = *pbVar5;
      pbVar6[-1] = pbVar5[1];
      *pbVar6 = pbVar5[2];
    }
    BufferToShortcutKey(param_2,param_1);
    BufferToMacroKey(pbVar4,local_8);
    param_1 = param_1 + 0x34;
    param_2 = param_2 + 0x20;
    pbVar6 = pbVar6 + 3;
    local_8 = local_8 + 0x250;
    pbVar5 = pbVar5 + 4;
    pbVar4 = pbVar4 + 0x180;
    local_c = local_c + -1;
  } while (local_c != 0);
  return;
}


//==== FUN_10006d40 @ 10006d40

void __fastcall FUN_10006d40(byte *param_1,byte *param_2)

{
  byte bVar1;
  undefined4 uVar2;
  undefined4 uVar3;
  undefined4 *puVar4;
  undefined4 *puVar5;
  undefined4 uVar6;
  int iVar7;
  byte *pbVar8;
  void *extraout_ECX;
  void *extraout_ECX_00;
  void *extraout_ECX_01;
  void *extraout_ECX_02;
  void *extraout_ECX_03;
  void *extraout_ECX_04;
  void *extraout_ECX_05;
  void *extraout_ECX_06;
  void *extraout_ECX_07;
  void *extraout_ECX_08;
  void *extraout_ECX_09;
  void *extraout_ECX_10;
  void *extraout_ECX_11;
  void *extraout_ECX_12;
  void *extraout_ECX_13;
  void *extraout_ECX_14;
  void *extraout_ECX_15;
  void *extraout_ECX_16;
  void *extraout_ECX_17;
  void *extraout_ECX_18;
  void *extraout_ECX_19;
  void *extraout_ECX_20;
  void *extraout_ECX_21;
  void *extraout_ECX_22;
  int iVar9;
  byte *pbVar10;
  undefined4 *puVar11;
  byte *pbVar12;
  byte *pbVar13;
  byte *local_31c;
  int local_318;
  undefined4 *local_314;
  int local_310;
  int local_30c;
  byte local_308 [384];
  byte local_188 [384];
  uint local_8;
  
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  local_314 = (undefined4 *)0x0;
  local_310 = 0;
  local_30c = 0;
  if (*param_2 != *param_1) {
    *param_2 = *param_1;
    local_188[0] = *param_1;
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX,0,2,1);
  }
  if (param_2[1] != param_1[1]) {
    param_2[1] = param_1[1];
    local_188[0] = param_1[1];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_00,2,2,1);
  }
  if (param_2[2] != param_1[2]) {
    param_2[2] = param_1[2];
    local_188[0] = param_1[2];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_01,4,2,1);
  }
  if (param_2[3] != param_1[3]) {
    param_2[3] = param_1[3];
    local_188[0] = param_1[3];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_02,6,2,1);
  }
  if (param_2[4] != param_1[4]) {
    param_2[4] = param_1[4];
    local_188[0] = param_1[4];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_03,8,2,1);
  }
  if (param_2[5] != param_1[5]) {
    param_2[5] = param_1[5];
    local_188[0] = param_1[5];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_04,10,2,1);
  }
  if (param_2[6] != param_1[6]) {
    param_2[6] = param_1[6];
    local_188[0] = param_1[6];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_05,0xa9,2,1);
  }
  if (param_2[7] != param_1[7]) {
    param_2[7] = param_1[7];
    local_188[0] = param_1[7] != 0;
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_06,0xab,2,1);
  }
  if (param_2[8] != param_1[8]) {
    param_2[8] = param_1[8];
    local_188[0] = param_1[8];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_07,0xad,2,1);
  }
  if (param_2[9] != param_1[9]) {
    param_2[9] = param_1[9];
    local_188[0] = param_1[9];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_08,0xaf,2,1);
  }
  if (param_2[10] != param_1[10]) {
    param_2[10] = param_1[10];
    local_188[0] = param_1[10];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_09,0xb1,2,1);
  }
  if (param_2[0xb] != param_1[0xb]) {
    param_2[0xb] = param_1[0xb];
    local_188[0] = param_1[0xb];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_10,0xb3,2,1);
  }
  if (param_2[0xc] != param_1[0xc]) {
    param_2[0xc] = param_1[0xc];
    local_188[0] = param_1[0xc];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_11,0xb5,2,1);
  }
  if (param_2[0xd] != param_1[0xd]) {
    param_2[0xd] = param_1[0xd];
    local_188[0] = param_1[0xd];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_12,0xb7,2,1);
  }
  if (param_2[0xe] != param_1[0xe]) {
    param_2[0xe] = param_1[0xe];
    local_188[0] = param_1[0xe];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_13,0xb9,2,1);
  }
  pbVar13 = param_1 + 0x11;
  iVar7 = (int)param_1 - (int)param_2;
  pbVar12 = param_2 + 0x10;
  local_318 = 0x2c;
  do {
    if (((pbVar12[-1] != pbVar13[-2]) || (*pbVar12 != pbVar12[iVar7])) || (pbVar12[1] != *pbVar13))
    {
      pbVar12[-1] = pbVar13[-2];
      *pbVar12 = pbVar12[iVar7];
      pbVar12[1] = *pbVar13;
      local_188[0] = pbVar13[-2];
      local_188[1] = pbVar12[iVar7];
      local_188[2] = *pbVar13;
      uVar6 = FUN_1000c190((uint)local_188,0,3);
      local_188[3] = (byte)uVar6;
      FUN_10006b00(&local_314,extraout_ECX_14,local_318 + -0x20,4,1);
    }
    if (((pbVar12[2] != pbVar13[1]) || (pbVar12[3] != pbVar13[2])) || (pbVar12[4] != pbVar13[3])) {
      pbVar12[2] = pbVar13[1];
      pbVar12[3] = pbVar13[2];
      pbVar12[4] = pbVar13[3];
      local_188[0] = pbVar13[1];
      local_188[1] = pbVar13[2];
      local_188[2] = pbVar13[3];
      uVar6 = FUN_1000c190((uint)local_188,0,3);
      local_188[3] = (byte)uVar6;
      FUN_10006b00(&local_314,extraout_ECX_15,local_318,4,1);
    }
    local_318 = local_318 + 4;
    pbVar12 = pbVar12 + 6;
    pbVar13 = pbVar13 + 6;
  } while (local_318 < 0x4c);
  if (param_2[0x3f] != param_1[0x3f]) {
    param_2[0x3f] = param_1[0x3f];
    local_188[0] = param_1[0x3f];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_16,0x4c,2,1);
  }
  if (param_2[0x40] != param_1[0x40]) {
    param_2[0x40] = param_1[0x40];
    local_188[0] = param_1[0x40];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_17,0x4e,2,1);
  }
  if (param_2[0x41] != param_1[0x41]) {
    param_2[0x41] = param_1[0x41];
    local_188[0] = param_1[0x41];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_18,0x50,2,1);
  }
  if (param_2[0x42] != param_1[0x42]) {
    param_2[0x42] = param_1[0x42];
    local_188[0] = param_1[0x42];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_19,0x52,2,1);
  }
  if (((param_2[0x43] != param_1[0x43]) || (param_2[0x47] != param_1[0x47])) ||
     ((param_2[0x48] != param_1[0x48] ||
      (((param_2[0x44] != param_1[0x44] || (param_2[0x45] != param_1[0x45])) ||
       (param_2[0x46] != param_1[0x46])))))) {
    param_2[0x43] = param_1[0x43];
    param_2[0x47] = param_1[0x47];
    param_2[0x48] = param_1[0x48];
    param_2[0x44] = param_1[0x44];
    param_2[0x45] = param_1[0x45];
    param_2[0x46] = param_1[0x46];
    local_188[0] = param_1[0x43];
    local_188[1] = param_1[0x44];
    local_188[2] = param_1[0x45];
    local_188[3] = param_1[0x46];
    local_188[4] = param_1[0x47];
    local_188[5] = param_1[0x48];
    uVar6 = FUN_1000c190((uint)local_188,0,6);
    local_188[6] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_20,0xa0,7,1);
  }
  if (param_2[0x49] != param_1[0x49]) {
    param_2[0x49] = param_1[0x49];
    local_188[0] = param_1[0x49];
    uVar6 = FUN_1000c190((uint)local_188,0,1);
    local_188[1] = (byte)uVar6;
    FUN_10006b00(&local_314,extraout_ECX_21,0xa7,2,1);
  }
  pbVar13 = param_1 + 0x4c;
  pbVar12 = param_2 + 0x4a;
  local_318 = 0x60;
  do {
    bVar1 = pbVar12[iVar7];
    if (((*pbVar12 != bVar1) || (pbVar12[1] != pbVar13[-1])) || (pbVar12[2] != *pbVar13)) {
      local_188[1] = pbVar13[-1];
      local_188[2] = *pbVar13;
      local_188[0] = bVar1;
      uVar6 = FUN_1000c190((uint)local_188,0,3);
      local_188[3] = (byte)uVar6;
      FUN_10006b00(&local_314,extraout_ECX_22,local_318,4,1);
      *pbVar12 = pbVar12[iVar7];
      pbVar12[1] = pbVar13[-1];
      pbVar12[2] = *pbVar13;
    }
    local_318 = local_318 + 4;
    pbVar12 = pbVar12 + 3;
    pbVar13 = pbVar13 + 3;
  } while (local_318 < 0xa0);
  local_31c = param_1 + 0x82;
  local_318 = 0x100;
  pbVar13 = param_2 + 0x7c;
  do {
    memset(local_188,0xff,0x180);
    memset(local_308,0xff,0x180);
    pbVar12 = pbVar13 + iVar7;
    ShortcutKeyToBuffer(pbVar12,local_188);
    ShortcutKeyToBuffer(pbVar13,local_308);
    iVar9 = 0;
    do {
      if (local_188[iVar9] != local_308[iVar9]) {
        FUN_10006be0(&local_314,(int)local_188,local_318,(uint)*pbVar12 * 3 + 2);
        bVar1 = *pbVar12;
        iVar9 = 0;
        *pbVar13 = bVar1;
        if (bVar1 != 0) {
          pbVar12 = pbVar13 + 5;
          pbVar8 = local_31c;
          do {
            *pbVar12 = pbVar12[iVar7];
            iVar9 = iVar9 + 1;
            pbVar12[-1] = pbVar8[-2];
            pbVar12[1] = *pbVar8;
            pbVar12[2] = pbVar8[1];
            *(undefined4 *)(pbVar12 + 3) = *(undefined4 *)(pbVar8 + 2);
            pbVar12 = pbVar12 + 8;
            pbVar8 = pbVar8 + 8;
          } while (iVar9 < (int)(uint)*pbVar13);
        }
        break;
      }
      iVar9 = iVar9 + 1;
    } while (iVar9 < 0x180);
    pbVar13 = pbVar13 + 0x34;
    local_31c = local_31c + 0x34;
    local_318 = local_318 + 0x20;
  } while (local_318 < 0x300);
  pbVar12 = param_1 + 0x3db;
  local_31c = (byte *)0x300;
  pbVar13 = param_2 + 0x3bc;
  do {
    memset(local_188,0xff,0x180);
    memset(local_308,0xff,0x180);
    MacroKeyToBuffer(pbVar13 + iVar7,local_188);
    MacroKeyToBuffer(pbVar13,local_308);
    iVar9 = 0;
    while (local_188[iVar9] == local_308[iVar9]) {
      iVar9 = iVar9 + 1;
      if (0x17f < iVar9) goto LAB_10007782;
    }
    FUN_10006be0(&local_314,(int)local_188,(int)local_31c,(uint)*pbVar12 * 5 + 0x21);
    bVar1 = pbVar13[iVar7];
    *pbVar13 = bVar1;
    memcpy(pbVar13 + 1,pbVar13 + 1 + iVar7,(uint)bVar1);
    pbVar13[0x1f] = *pbVar12;
    iVar9 = 0x46;
    pbVar8 = pbVar13 + 0x21;
    pbVar10 = pbVar12 + 3;
    do {
      *pbVar8 = pbVar8[iVar7];
      pbVar8[-1] = pbVar10[-2];
      pbVar8[1] = *pbVar10;
      pbVar8[2] = pbVar10[1];
      *(undefined4 *)(pbVar8 + 3) = *(undefined4 *)(pbVar10 + 2);
      iVar9 = iVar9 + -1;
      pbVar8 = pbVar8 + 8;
      pbVar10 = pbVar10 + 8;
    } while (iVar9 != 0);
LAB_10007782:
    puVar5 = local_314;
    pbVar12 = pbVar12 + 0x250;
    local_31c = (byte *)((int)local_31c + 0x180);
    pbVar13 = pbVar13 + 0x250;
    if (0x1aff < (int)local_31c) {
      iVar7 = (local_310 - (int)local_314 >> 2) * -0x33333333;
      if (iVar7 != 0) {
        iVar9 = _Mtx_lock(&DAT_10023160);
        puVar11 = puVar5;
        if (iVar9 != 0) {
          std::_Throw_C_error(iVar9);
        }
        do {
          puVar4 = DAT_10023194;
          if (DAT_10023194 == DAT_10023198) {
            FUN_10006280(&DAT_10023190,DAT_10023194,puVar11);
          }
          else {
            uVar6 = puVar11[1];
            uVar2 = puVar11[2];
            uVar3 = puVar11[3];
            *DAT_10023194 = *puVar11;
            puVar4[1] = uVar6;
            puVar4[2] = uVar2;
            puVar4[3] = uVar3;
            puVar4[4] = puVar11[4];
            DAT_10023194 = DAT_10023194 + 5;
          }
          iVar7 = iVar7 + -1;
          puVar11 = puVar11 + 5;
        } while (iVar7 != 0);
        _Mtx_unlock(&DAT_10023160);
      }
      if (puVar5 != (undefined4 *)0x0) {
        puVar11 = puVar5;
        if ((0xfff < (uint)((local_30c - (int)puVar5 >> 2) * 4)) &&
           (puVar11 = (undefined4 *)puVar5[-1], 0x1f < (uint)((int)puVar5 + (-4 - (int)puVar11)))) {
                    /* WARNING: Subroutine does not return */
          _invalid_parameter_noinfo_noreturn();
        }
        FUN_10013814(puVar11);
      }
      FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
      return;
    }
  } while( true );
}


//==== FUN_10006b00 @ 10006b00

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall
FUN_10006b00(void *param_1,void *param_2,undefined4 param_3,size_t param_4,undefined1 param_5)

{
  undefined4 *puVar1;
  undefined4 uVar2;
  undefined1 local_30;
  undefined1 uStack_2f;
  undefined1 uStack_2e;
  undefined1 uStack_2d;
  undefined1 uStack_2c;
  undefined1 uStack_2b;
  undefined1 uStack_2a;
  undefined1 uStack_29;
  byte bStack_28;
  undefined2 uStack_27;
  undefined4 uStack_25;
  undefined4 uStack_21;
  undefined1 uStack_1d;
  undefined1 local_1c [20];
  uint local_8;
  
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_2e = (undefined1)((uint)_DAT_100172c0 >> 0x10);
  uStack_2d = (undefined1)((uint)_DAT_100172c0 >> 0x18);
  uStack_2c = (undefined1)_UNK_100172c4;
  uStack_2b = (undefined1)((uint)_UNK_100172c4 >> 8);
  uStack_2a = (undefined1)((uint)_UNK_100172c4 >> 0x10);
  uStack_29 = (undefined1)((uint)_UNK_100172c4 >> 0x18);
  bStack_28 = (byte)_UNK_100172c8;
  uStack_27 = (undefined2)((uint)_UNK_100172c8 >> 8);
  uStack_25._1_3_ = (undefined3)_UNK_100172cc;
  uStack_25 = CONCAT31(uStack_25._1_3_,(char)((uint)_UNK_100172c8 >> 0x18));
  local_30 = param_5;
  uStack_21 = CONCAT31(0xffffff,(char)((uint)_UNK_100172cc >> 0x18));
  uStack_1d = 0xff;
  uStack_2f = 1;
  memcpy(local_1c,param_2,param_4);
  uStack_27 = 0;
  uStack_25 = 0;
  uStack_21 = 0;
  uStack_1d = 0;
  uStack_2d = 8;
  uStack_2c = 7;
  uStack_2b = 0;
  uStack_2a = (undefined1)((uint)param_3 >> 8);
  uStack_29 = (undefined1)param_3;
  bStack_28 = (byte)param_4;
  if (DAT_1001e881 != '\0') {
    bStack_28 = bStack_28 | 0x80;
  }
  memcpy(&uStack_27,local_1c,param_4);
  uVar2 = FUN_1000c190((uint)&uStack_2d,0,0x10);
  puVar1 = *(undefined4 **)((int)param_1 + 4);
  uStack_1d = (undefined1)uVar2;
  if (puVar1 != *(undefined4 **)((int)param_1 + 8)) {
    *puVar1 = CONCAT13(uStack_2d,CONCAT12(uStack_2e,CONCAT11(uStack_2f,local_30)));
    puVar1[1] = CONCAT13(uStack_29,CONCAT12(uStack_2a,CONCAT11(uStack_2b,uStack_2c)));
    puVar1[2] = CONCAT13((undefined1)uStack_25,CONCAT21(uStack_27,bStack_28));
    puVar1[3] = CONCAT13((undefined1)uStack_21,uStack_25._1_3_);
    puVar1[4] = CONCAT13(uStack_1d,uStack_21._1_3_);
    *(int *)((int)param_1 + 4) = *(int *)((int)param_1 + 4) + 0x14;
    FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
    return;
  }
  FUN_10006280(param_1,puVar1,(undefined4 *)&local_30);
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== ShortcutKeyToBuffer @ 100078a0

void __cdecl ShortcutKeyToBuffer(byte *param_1,byte *param_2)

{
  byte *pbVar1;
  byte *pbVar2;
  undefined4 uVar3;
  byte *pbVar4;
  byte bVar5;
  byte *pbVar6;
  byte *pbVar7;
  
                    /* 0x78a0  105  ShortcutKeyToBuffer */
  pbVar2 = param_1;
  pbVar7 = (byte *)0x0;
  *param_2 = *param_1;
  bVar5 = *param_1;
  if (4 < (byte)(bVar5 - 2)) {
    *param_1 = 0;
    param_1[4] = 0;
    param_1[5] = 0;
    param_1[6] = 0;
    param_1[7] = 0;
    param_1[8] = 0;
    param_1[9] = 0;
    param_1[10] = 0;
    param_1[0xb] = 0;
    param_1[0xc] = 0;
    param_1[0xd] = 0;
    param_1[0xe] = 0;
    param_1[0xf] = 0;
    param_1[0x10] = 0;
    param_1[0x11] = 0;
    param_1[0x12] = 0;
    param_1[0x13] = 0;
    param_1[0x14] = 0;
    param_1[0x15] = 0;
    param_1[0x16] = 0;
    param_1[0x17] = 0;
    param_1[0x18] = 0;
    param_1[0x19] = 0;
    param_1[0x1a] = 0;
    param_1[0x1b] = 0;
    param_1[0x1c] = 0;
    param_1[0x1d] = 0;
    param_1[0x1e] = 0;
    param_1[0x1f] = 0;
    param_1[0x20] = 0;
    param_1[0x21] = 0;
    param_1[0x22] = 0;
    param_1[0x23] = 0;
    param_1[0x24] = 0;
    param_1[0x25] = 0;
    param_1[0x26] = 0;
    param_1[0x27] = 0;
    param_1[0x28] = 0;
    param_1[0x29] = 0;
    param_1[0x2a] = 0;
    param_1[0x2b] = 0;
    param_1[0x2c] = 0;
    param_1[0x2d] = 0;
    param_1[0x2e] = 0;
    param_1[0x2f] = 0;
    param_1[0x30] = 0;
    param_1[0x31] = 0;
    param_1[0x32] = 0;
    param_1[0x33] = 0;
    return;
  }
  param_1 = (byte *)0x0;
  if (bVar5 != 0) {
    pbVar4 = param_2 + 1;
    pbVar6 = pbVar2 + 5;
    do {
      *pbVar4 = 0;
      if (pbVar6[-1] == 0) {
        *pbVar4 = 0x80;
        bVar5 = 0x80;
      }
      else {
        bVar5 = 0;
        if (pbVar6[-1] == 1) {
          *pbVar4 = 0x40;
          bVar5 = 0x40;
        }
      }
      pbVar7 = pbVar4 + (3 - (int)param_2);
      *pbVar4 = *pbVar6 | bVar5;
      param_1 = param_1 + 1;
      pbVar4[1] = pbVar6[1];
      pbVar1 = pbVar6 + 2;
      pbVar6 = pbVar6 + 8;
      pbVar4[2] = *pbVar1;
      pbVar4 = pbVar4 + 3;
    } while ((int)param_1 < (int)(uint)*pbVar2);
  }
  uVar3 = FUN_1000c190((uint)param_2,0,(int)pbVar7);
  pbVar7[(int)param_2] = (byte)uVar3;
  return;
}


//==== BufferToShortcutKey @ 10007970

void __cdecl BufferToShortcutKey(byte *param_1,byte *param_2)

{
  byte *pbVar1;
  byte bVar2;
  undefined4 uVar3;
  int extraout_ECX;
  byte *pbVar4;
  int iVar5;
  byte *pbVar6;
  
                    /* 0x7970  6  BufferToShortcutKey */
  bVar2 = *param_1;
  *param_2 = bVar2;
  iVar5 = (uint)bVar2 * 3 + 1;
  if (((byte)(bVar2 - 2) < 5) &&
     (uVar3 = FUN_1000c190((uint)param_1,0,iVar5), *(char *)(iVar5 + extraout_ECX) == (char)uVar3))
  {
    iVar5 = 0;
    if (bVar2 == 0) {
      return;
    }
    pbVar6 = (byte *)(extraout_ECX + 1);
    pbVar4 = param_2 + 4;
    do {
      *pbVar4 = 2;
      if ((*pbVar6 & 0xc0) == 0x80) {
        *pbVar4 = 0;
      }
      else {
        bVar2 = *pbVar4;
        if ((*pbVar6 & 0xc0) == 0x40) {
          bVar2 = 1;
        }
        *pbVar4 = bVar2;
      }
      iVar5 = iVar5 + 1;
      pbVar4[1] = *pbVar6 & 0xf;
      pbVar4[2] = pbVar6[1];
      pbVar1 = pbVar6 + 2;
      pbVar6 = pbVar6 + 3;
      pbVar4[3] = *pbVar1;
      pbVar4[4] = 0;
      pbVar4[5] = 0;
      pbVar4[6] = 0;
      pbVar4[7] = 0;
      pbVar4 = pbVar4 + 8;
    } while (iVar5 < (int)(uint)*param_2);
    return;
  }
  *param_2 = 0;
  param_2[4] = 0;
  param_2[5] = 0;
  param_2[6] = 0;
  param_2[7] = 0;
  param_2[8] = 0;
  param_2[9] = 0;
  param_2[10] = 0;
  param_2[0xb] = 0;
  param_2[0xc] = 0;
  param_2[0xd] = 0;
  param_2[0xe] = 0;
  param_2[0xf] = 0;
  param_2[0x10] = 0;
  param_2[0x11] = 0;
  param_2[0x12] = 0;
  param_2[0x13] = 0;
  param_2[0x14] = 0;
  param_2[0x15] = 0;
  param_2[0x16] = 0;
  param_2[0x17] = 0;
  param_2[0x18] = 0;
  param_2[0x19] = 0;
  param_2[0x1a] = 0;
  param_2[0x1b] = 0;
  param_2[0x1c] = 0;
  param_2[0x1d] = 0;
  param_2[0x1e] = 0;
  param_2[0x1f] = 0;
  param_2[0x20] = 0;
  param_2[0x21] = 0;
  param_2[0x22] = 0;
  param_2[0x23] = 0;
  param_2[0x24] = 0;
  param_2[0x25] = 0;
  param_2[0x26] = 0;
  param_2[0x27] = 0;
  param_2[0x28] = 0;
  param_2[0x29] = 0;
  param_2[0x2a] = 0;
  param_2[0x2b] = 0;
  param_2[0x2c] = 0;
  param_2[0x2d] = 0;
  param_2[0x2e] = 0;
  param_2[0x2f] = 0;
  param_2[0x30] = 0;
  param_2[0x31] = 0;
  param_2[0x32] = 0;
  param_2[0x33] = 0;
  return;
}


//==== MacroKeyToBuffer @ 10007a60

void __cdecl MacroKeyToBuffer(byte *param_1,byte *param_2)

{
  byte bVar1;
  undefined4 uVar2;
  byte *pbVar3;
  int iVar4;
  byte *pbVar5;
  byte *pbVar6;
  
                    /* 0x7a60  100  MacroKeyToBuffer */
  pbVar5 = (byte *)0x20;
  bVar1 = *param_1;
  *param_2 = bVar1;
  if (bVar1 != 0) {
    memcpy(param_2 + 1,param_1 + 1,(uint)bVar1);
  }
  param_2[0x1f] = param_1[0x1f];
  bVar1 = param_1[0x1f];
  if (bVar1 != 0) {
    pbVar6 = param_2 + 0x22;
    pbVar3 = param_1 + 0x21;
    iVar4 = 0;
    do {
      bVar1 = *pbVar3 & 0xf;
      if (pbVar3[-1] == 0) {
        bVar1 = bVar1 | 0x80;
      }
      else if (pbVar3[-1] == 1) {
        bVar1 = bVar1 | 0x40;
      }
      pbVar6[-2] = bVar1;
      iVar4 = iVar4 + 1;
      pbVar6[-1] = pbVar3[1];
      *pbVar6 = pbVar3[2];
      pbVar6[1] = (byte)((uint)*(undefined4 *)(pbVar3 + 3) >> 8);
      pbVar5 = pbVar3 + 3;
      pbVar3 = pbVar3 + 8;
      pbVar6[2] = *pbVar5;
      bVar1 = param_1[0x1f];
      pbVar5 = pbVar6 + (3 - (int)param_2);
      pbVar6 = pbVar6 + 5;
    } while (iVar4 < (int)(uint)bVar1);
  }
  uVar2 = FUN_1000c190((uint)param_2,0x1f,(uint)bVar1 * 5 + 0x20);
  pbVar5[(int)param_2] = (byte)uVar2;
  return;
}


//==== BufferToMacroKey @ 10007b30

void __cdecl BufferToMacroKey(byte *param_1,byte *param_2)

{
  byte *pbVar1;
  byte *pbVar2;
  byte *pbVar3;
  byte bVar4;
  undefined4 uVar5;
  int iVar6;
  byte *pbVar7;
  byte *pbVar8;
  
                    /* 0x7b30  5  BufferToMacroKey */
  pbVar3 = param_2;
  pbVar8 = param_2 + 1;
  *param_2 = 0;
  pbVar8[0] = 0;
  pbVar8[1] = 0;
  pbVar8[2] = 0;
  pbVar8[3] = 0;
  param_2[5] = 0;
  param_2[6] = 0;
  param_2[7] = 0;
  param_2[8] = 0;
  param_2[9] = 0;
  param_2[10] = 0;
  param_2[0xb] = 0;
  param_2[0xc] = 0;
  param_2[0xd] = 0;
  param_2[0xe] = 0;
  param_2[0xf] = 0;
  param_2[0x10] = 0;
  param_2[0x11] = 0;
  param_2[0x12] = 0;
  param_2[0x13] = 0;
  param_2[0x14] = 0;
  param_2[0x15] = 0;
  param_2[0x16] = 0;
  param_2[0x17] = 0;
  param_2[0x18] = 0;
  param_2[0x19] = 0;
  param_2[0x1a] = 0;
  param_2[0x1b] = 0;
  param_2[0x1c] = 0;
  param_2[0x1d] = 0;
  param_2[0x1e] = 0;
  bVar4 = *param_1;
  if ((byte)(bVar4 - 1) < 0x1e) {
    *param_2 = bVar4;
    memcpy(pbVar8,param_1 + 1,(uint)bVar4);
  }
  bVar4 = param_1[0x1f];
  param_2[0x1f] = bVar4;
  if ((1 < bVar4) && (bVar4 < 0x47)) {
    iVar6 = (uint)bVar4 * 5;
    uVar5 = FUN_1000c190((uint)param_1,0x1f,iVar6 + 0x20);
    if (param_1[iVar6 + 0x20] == (byte)uVar5) {
      param_2 = (byte *)0x0;
      if (bVar4 == 0) {
        return;
      }
      pbVar8 = param_1 + 0x22;
      pbVar7 = pbVar3 + 0x20;
      do {
        *pbVar7 = 2;
        if ((pbVar8[-2] & 0xc0) == 0x80) {
          *pbVar7 = 0;
        }
        else {
          bVar4 = *pbVar7;
          if ((pbVar8[-2] & 0xc0) == 0x40) {
            bVar4 = 1;
          }
          *pbVar7 = bVar4;
        }
        pbVar7[1] = pbVar8[-2] & 0xf;
        pbVar7[2] = pbVar8[-1];
        pbVar7[3] = *pbVar8;
        pbVar1 = pbVar8 + 1;
        pbVar2 = pbVar8 + 2;
        pbVar8 = pbVar8 + 5;
        *(uint *)(pbVar7 + 4) = (uint)CONCAT11(*pbVar1,*pbVar2);
        pbVar7 = pbVar7 + 8;
        param_2 = param_2 + 1;
      } while ((int)param_2 < (int)(uint)pbVar3[0x1f]);
      return;
    }
  }
  param_2[0x1f] = 0;
  iVar6 = 0x46;
  pbVar8 = param_2 + 0x21;
  do {
    pbVar8[-0xffffffff00000001] = 0;
    pbVar8[0] = 0;
    pbVar8[1] = 0;
    pbVar8[2] = 0;
    pbVar8[3] = 0;
    pbVar8[4] = 0;
    pbVar8[5] = 0;
    pbVar8[6] = 0;
    iVar6 = iVar6 + -1;
    pbVar8 = pbVar8 + 8;
  } while (iVar6 != 0);
  return;
}


//==== UsbServer_ReadFalshData @ 1000ca70

void __cdecl UsbServer_ReadFalshData(int param_1,uint param_2,undefined1 param_3)

{
  undefined4 *puVar1;
  int iVar2;
  undefined4 uVar3;
  bool local_1c [3];
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined1 uStack_17;
  undefined1 uStack_16;
  undefined1 uStack_15;
  byte bStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xca70  183  UsbServer_ReadFalshData */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_19 = 0;
  uStack_18 = 0;
  uStack_17 = 0;
  uStack_16 = 0;
  uStack_15 = 0;
  bStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  local_1c[0] = true;
  local_1c[1] = true;
  local_1c[2] = (bool)param_3;
  iVar2 = _Mtx_lock(&DAT_10023160);
  if (iVar2 != 0) {
    std::_Throw_C_error(iVar2);
  }
  if (0 < (int)param_2) {
    do {
      uStack_9 = 0;
      uStack_13 = 0;
      uStack_11 = 0;
      uStack_d = 0;
      uStack_19 = 8;
      uStack_18 = 8;
      uStack_17 = 0;
      uStack_16 = (undefined1)((uint)param_1 >> 8);
      uStack_15 = (undefined1)param_1;
      if (param_2 < 10) {
        bStack_14 = (byte)param_2;
        if (DAT_1001e881 != '\0') {
          bStack_14 = bStack_14 | 0x80;
        }
        uVar3 = FUN_1000c190((uint)&uStack_19,0,0x10);
        uStack_9 = (undefined1)uVar3;
        local_1c[0] = true;
        param_2 = 0;
      }
      else {
        bStack_14 = 10;
        if (DAT_1001e881 != '\0') {
          bStack_14 = 0x8a;
        }
        uVar3 = FUN_1000c190((uint)&uStack_19,0,0x10);
        uStack_9 = (undefined1)uVar3;
        param_1 = param_1 + 10;
        local_1c[0] = param_2 == 10;
        param_2 = param_2 - 10;
      }
      puVar1 = DAT_10023194;
      local_1c[1] = true;
      if (DAT_10023194 == DAT_10023198) {
        FUN_10006280(&DAT_10023190,DAT_10023194,(undefined4 *)local_1c);
      }
      else {
        *DAT_10023194 = CONCAT13(uStack_19,CONCAT12(local_1c[2],CONCAT11(1,local_1c[0])));
        puVar1[1] = CONCAT13(uStack_15,CONCAT12(uStack_16,CONCAT11(uStack_17,uStack_18)));
        puVar1[2] = CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,bStack_14));
        puVar1[3] = CONCAT13((undefined1)uStack_d,uStack_11._1_3_);
        puVar1[4] = CONCAT13(uStack_9,uStack_d._1_3_);
        DAT_10023194 = DAT_10023194 + 5;
      }
    } while (0 < (int)param_2);
  }
  _Mtx_unlock(&DAT_10023160);
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_ReadAllFlashData @ 1000cbd0

void CS_UsbServer_ReadAllFlashData(void)

{
                    /* 0xcbd0  61  CS_UsbServer_ReadAllFlashData
                       0xcbd0  175  UsbServer_ReadAllFlashData */
  UsbServer_ReadFalshData(0,0xc0,1);
  return;
}


//==== CS_UsbServer_ReadOnLine @ 1000cd40

void CS_UsbServer_ReadOnLine(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xcd40  71  CS_UsbServer_ReadOnLine
                       0xcd40  185  UsbServer_ReadOnLine */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 3;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_ReadBatteryLevel @ 1000cdc0

void CS_UsbServer_ReadBatteryLevel(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xcdc0  62  CS_UsbServer_ReadBatteryLevel
                       0xcdc0  176  UsbServer_ReadBatteryLevel */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 4;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_SetPCDriverStatus @ 1000cc50

void __cdecl UsbServer_SetPCDriverStatus(char param_1)

{
  undefined4 uVar1;
  undefined4 extraout_EAX;
  undefined4 extraout_EDX;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  char cStack_13;
  undefined1 uStack_12;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xcc50  198  UsbServer_SetPCDriverStatus */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 1;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x81;
  }
  uStack_9 = 0;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_12 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_19 = 8;
  uStack_18 = 2;
  cStack_13 = param_1;
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT12(uStack_12,CONCAT11(cStack_13,uStack_14))),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  DAT_1001c129 = param_1;
  if (param_1 != '\0') {
    DAT_1001c0d8 = 1;
    GetTickCount64();
    DAT_1001c0e8 = 0;
    DAT_1001c0e0 = extraout_EAX;
    DAT_1001c0e4 = extraout_EDX;
    FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
    return;
  }
  DAT_1001c0d8 = 0;
  DAT_1001c0f0 = 0;
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_EnterDonglePairOnlyCid @ 1000cef0

void __cdecl UsbServer_EnterDonglePairOnlyCid(undefined1 param_1)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined1 uStack_11;
  undefined3 uStack_10;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xcef0  163  UsbServer_EnterDonglePairOnlyCid */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 2;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x82;
  }
  uStack_9 = 0;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_d = 0;
  uStack_19 = 8;
  uStack_18 = 5;
  uStack_13 = 0;
  uStack_11 = param_1;
  uStack_10 = 0;
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13(uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_10),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_EnterDonglePairWithCidMid @ 1000ce50

void __cdecl UsbServer_EnterDonglePairWithCidMid(undefined1 param_1,undefined1 param_2)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined1 uStack_13;
  undefined1 uStack_12;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xce50  164  UsbServer_EnterDonglePairWithCidMid */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 2;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x82;
  }
  uStack_9 = 0;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_13 = param_1;
  uStack_19 = 8;
  uStack_18 = 5;
  uStack_12 = param_2;
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT12(uStack_12,CONCAT11(uStack_13,uStack_14))),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_ReadDonglePairStatus @ 1000cf90

void UsbServer_ReadDonglePairStatus(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined1 uStack_17;
  undefined1 uStack_16;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xcf90  181  UsbServer_ReadDonglePairStatus */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_16 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 6;
  uStack_17 = 0;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),
             CONCAT13(uStack_15,CONCAT12(uStack_16,CONCAT11(uStack_17,uStack_18))),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_SetClearSetting @ 1000d020

void CS_UsbServer_SetClearSetting(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd020  79  CS_UsbServer_SetClearSetting
                       0xd020  193  UsbServer_SetClearSetting */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 9;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_ReadConfig @ 1000d430

void CS_UsbServer_ReadConfig(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd430  64  CS_UsbServer_ReadConfig
                       0xd430  178  UsbServer_ReadConfig */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 0xe;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_SetCurrentConfig @ 1000d4b0

void __cdecl UsbServer_SetCurrentConfig(undefined1 param_1)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined1 uStack_13;
  undefined1 uStack_12;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd4b0  194  UsbServer_SetCurrentConfig */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 1;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x81;
  }
  uStack_9 = 0;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_12 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_19 = 8;
  uStack_18 = 0xf;
  uStack_13 = param_1;
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT12(uStack_12,CONCAT11(uStack_13,uStack_14))),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_ReadVersion @ 1000d5d0

void CS_UsbServer_ReadVersion(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd5d0  73  CS_UsbServer_ReadVersion
                       0xd5d0  187  UsbServer_ReadVersion */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 0x12;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_ReadCurrentDPI @ 1000d650

void CS_UsbServer_ReadCurrentDPI(void)

{
                    /* 0xd650  65  CS_UsbServer_ReadCurrentDPI
                       0xd650  179  UsbServer_ReadCurrentDPI */
  UsbServer_ReadFalshData(4,1,0);
  return;
}


//==== CS_UsbServer_ReadReportRate @ 1000d660

void CS_UsbServer_ReadReportRate(void)

{
                    /* 0xd660  72  CS_UsbServer_ReadReportRate
                       0xd660  186  UsbServer_ReadReportRate */
  UsbServer_ReadFalshData(0,1,0);
  return;
}


//==== CS_UsbServer_ReadDPILed @ 1000d670

void CS_UsbServer_ReadDPILed(void)

{
                    /* 0xd670  66  CS_UsbServer_ReadDPILed
                       0xd670  180  UsbServer_ReadDPILed */
  UsbServer_ReadFalshData(0x4c,8,0);
  return;
}


//==== CS_UsbServer_ReadLedBar @ 1000d680

void CS_UsbServer_ReadLedBar(void)

{
                    /* 0xd680  70  CS_UsbServer_ReadLedBar
                       0xd680  184  UsbServer_ReadLedBar */
  UsbServer_ReadFalshData(0xa0,9,0);
  return;
}


//==== UsbServer_Set4KDongleRGB @ 1000d6a0

void __cdecl UsbServer_Set4KDongleRGB(undefined1 *param_1)

{
  undefined8 uVar1;
  undefined4 uVar2;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined1 uStack_13;
  undefined1 uStack_12;
  undefined4 uStack_11;
  undefined1 uStack_d;
  undefined2 uStack_c;
  undefined1 uStack_a;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd6a0  188  UsbServer_Set4KDongleRGB */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 10;
  uStack_13 = *param_1;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x8a;
  }
  uStack_17 = 0;
  uStack_15 = 0;
  uVar1 = *(undefined8 *)(param_1 + 1);
  uStack_a = param_1[9];
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 0x14;
  uStack_12 = (undefined1)uVar1;
  uStack_11 = (undefined4)((ulonglong)uVar1 >> 8);
  uStack_d = (undefined1)((ulonglong)uVar1 >> 0x28);
  uStack_c = (undefined2)((ulonglong)uVar1 >> 0x30);
  uVar2 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar2;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT12(uStack_12,CONCAT11(uStack_13,uStack_14))),
             CONCAT13(uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,CONCAT12(uStack_a,uStack_c)));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_Get4KDongleRGBValue @ 1000d750

void CS_UsbServer_Get4KDongleRGBValue(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd750  53  CS_UsbServer_Get4KDongleRGBValue
                       0xd750  168  UsbServer_Get4KDongleRGBValue */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 0x15;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== UsbServer_SetLongRangeMode @ 1000d890

void __cdecl UsbServer_SetLongRangeMode(undefined1 param_1)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined1 uStack_13;
  undefined1 uStack_12;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd890  197  UsbServer_SetLongRangeMode */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_14 = 10;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x8a;
  }
  uStack_9 = 0;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_12 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_19 = 8;
  uStack_18 = 0x16;
  uStack_13 = param_1;
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT12(uStack_12,CONCAT11(uStack_13,uStack_14))),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== CS_UsbServer_GetLongRangeMode @ 1000d930

void CS_UsbServer_GetLongRangeMode(void)

{
  undefined4 uVar1;
  undefined1 uStack_19;
  undefined1 uStack_18;
  undefined2 uStack_17;
  undefined1 uStack_15;
  undefined1 uStack_14;
  undefined2 uStack_13;
  undefined4 uStack_11;
  undefined4 uStack_d;
  undefined1 uStack_9;
  uint local_8;
  
                    /* 0xd930  57  CS_UsbServer_GetLongRangeMode
                       0xd930  171  UsbServer_GetLongRangeMode */
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  uStack_17 = 0;
  uStack_15 = 0;
  uStack_14 = 0;
  uStack_13 = 0;
  uStack_11 = 0;
  uStack_d = 0;
  uStack_9 = 0;
  uStack_19 = 8;
  uStack_18 = 0x17;
  if (DAT_1001e881 != '\0') {
    uStack_14 = 0x80;
  }
  uVar1 = FUN_1000c190((uint)&uStack_19,0,0x10);
  uStack_9 = (undefined1)uVar1;
  UsbServer_WriteCommand
            (CONCAT13(uStack_19,0x101),CONCAT13(uStack_15,CONCAT21(uStack_17,uStack_18)),
             CONCAT13((undefined1)uStack_11,CONCAT21(uStack_13,uStack_14)),
             CONCAT13((undefined1)uStack_d,uStack_11._1_3_),CONCAT13(uStack_9,uStack_d._1_3_));
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


//==== FUN_1000dc20 @ 1000dc20

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

void __fastcall FUN_1000dc20(char *param_1,undefined1 *param_2)

{
  char cVar1;
  char cVar2;
  undefined4 uVar3;
  undefined4 uVar4;
  code *pcVar5;
  undefined4 *puVar6;
  int iVar7;
  byte bVar8;
  undefined4 extraout_EAX;
  undefined4 extraout_EAX_00;
  undefined4 extraout_EAX_01;
  undefined4 extraout_EAX_02;
  int iVar9;
  undefined4 uVar10;
  uint extraout_ECX;
  uint extraout_ECX_00;
  uint extraout_ECX_01;
  uint extraout_ECX_02;
  byte *pbVar11;
  void *extraout_ECX_03;
  void *extraout_ECX_04;
  void *this;
  undefined4 extraout_EDX;
  undefined4 extraout_EDX_00;
  undefined4 extraout_EDX_01;
  undefined4 extraout_EDX_02;
  int iVar12;
  int iVar13;
  bool bVar14;
  undefined4 local_28;
  undefined4 uStack_24;
  undefined4 uStack_20;
  undefined4 uStack_1c;
  char local_18;
  uint local_14;
  
  pcVar5 = DAT_10021154;
  uVar10 = _DAT_1001c120;
  local_14 = DAT_1001c004 ^ (uint)&stack0xfffffff0;
  cVar2 = '\0';
  iVar13 = 0;
  local_28 = *(undefined4 *)param_1;
  uStack_24 = *(undefined4 *)(param_1 + 4);
  uStack_20 = *(undefined4 *)(param_1 + 8);
  uStack_1c = *(undefined4 *)(param_1 + 0xc);
  local_18 = param_1[0x10];
  bVar14 = false;
  if (param_1[1] == '\n') {
    _DAT_10021160 = *(ulonglong *)(param_1 + 6);
    DAT_10021168 = *(undefined2 *)(param_1 + 0xe);
    if (DAT_1001c071 != '\0') {
      bVar8 = DAT_10021160;
      if ((_DAT_10021160 & 0x40) != 0) {
        FUN_10005770(&DAT_1001c070);
        DAT_1001c0d8 = 1;
        GetTickCount64();
        DAT_1001c0e8 = 5000;
        DAT_1001c0e0 = extraout_EAX;
        DAT_1001c0e4 = extraout_EDX;
        if (DAT_1001c128 != '\0') {
          if (DAT_1001c120 == 0) {
            bVar14 = true;
            DAT_1001c070 = DAT_1001c120;
          }
          else if ((DAT_1001c120 < 0x10) && (0xf < DAT_1001c070)) {
            bVar14 = true;
            DAT_1001c070 = 0xf;
          }
          else {
            bVar14 = false;
          }
          if (((char)((uint)uVar10 >> 8) != DAT_1001c121) || (bVar14)) {
            FUN_10005ab0(&DAT_1001c070,DAT_1001c070,pcVar5,'\x01');
            uVar10 = DAT_1001c100;
            if (DAT_1001c0f0 != '\0') {
              DAT_1001c0f0 = '\x01';
              GetTickCount64();
              DAT_1001c0f8 = extraout_EAX_00;
              DAT_1001c0fc = extraout_EDX_00;
            }
            DAT_1001c100 = uVar10;
          }
          if ((99 < DAT_1001c120) && (DAT_1001c070 < 100)) {
            DAT_1001c0d8 = 1;
            GetTickCount64();
            DAT_1001c0e8 = 100;
            DAT_1001c0f0 = '\x01';
            DAT_1001c0e0 = extraout_EAX_01;
            DAT_1001c0e4 = extraout_EDX_01;
            GetTickCount64();
            DAT_1001c100 = 100;
            DAT_1001c0f8 = extraout_EAX_02;
            DAT_1001c0fc = extraout_EDX_02;
          }
        }
        bVar8 = DAT_10021160 & 0xbf;
        _DAT_10021160 = _DAT_10021160 & 0xffffffffffffffbf;
      }
      if (bVar8 == 0) goto LAB_1000e1b5;
    }
    if (DAT_10021154 == (code *)0x0) goto LAB_1000e1b5;
    iVar13 = 10;
  }
  else {
    iVar9 = _Mtx_lock(&DAT_10023160);
    if (iVar9 != 0) {
      std::_Throw_C_error(iVar9);
    }
    if ((((DAT_10023194 - (int)DAT_10023190 >> 2) * -0x33333333 == 0) ||
        (*(char *)((int)DAT_10023190 + 1) != '\0')) ||
       (cVar1 = param_1[1], *(char *)(DAT_10023190 + 1) != cVar1)) {
LAB_1000e10d:
      _Mtx_unlock(&DAT_10023160);
      this = extraout_ECX_04;
      if (!bVar14) goto LAB_1000e1b5;
    }
    else {
      if (cVar1 == '\a') {
        iVar9 = 0;
        do {
          if (*(char *)((int)DAT_10023190 + iVar9 + 3) != param_1[iVar9]) {
            *(undefined1 *)((int)DAT_10023190 + 1) = 1;
            _Mtx_unlock(&DAT_10023160);
            FUN_10013806(local_14 ^ (uint)&stack0xfffffff0);
            return;
          }
          iVar9 = iVar9 + 1;
        } while (iVar9 < 0x11);
      }
      if ((*param_1 == '\b') && (cVar1 == '\b')) {
        switch(CONCAT11(param_1[3],param_1[4])) {
        case 0:
          uVar10 = FUN_1000c190((uint)param_1,6,7);
          if ((char)uVar10 == param_1[7]) {
            DAT_1001e890 = param_1[6];
          }
          break;
        case 4:
          uVar10 = FUN_1000c190((uint)param_1,6,7);
          if ((char)uVar10 == param_1[7]) {
            DAT_1001e892 = param_1[6];
          }
          break;
        case 0x4c:
          uVar10 = FUN_1000c190((uint)param_1,6,7);
          if ((char)uVar10 == param_1[7]) {
            DAT_1001e8cf = param_1[6];
          }
          uVar10 = FUN_1000c190(extraout_ECX,8,9);
          if ((char)uVar10 == param_1[9]) {
            DAT_1001e8d0 = param_1[8];
          }
          uVar10 = FUN_1000c190(extraout_ECX_00,10,0xb);
          if ((char)uVar10 == param_1[0xb]) {
            DAT_1001e8d1 = param_1[10];
          }
          uVar10 = FUN_1000c190(extraout_ECX_01,0xc,0xd);
          if ((char)uVar10 == param_1[0xd]) {
            DAT_1001e8d2 = param_1[0xc];
          }
          break;
        case 0xa0:
          uVar10 = FUN_1000c190((uint)param_1,6,0xc);
          if ((char)uVar10 == param_1[0xc]) {
            DAT_1001e8d3 = param_1[6];
            DAT_1001e8d4 = param_1[7];
            DAT_1001e8d5 = param_1[8];
            DAT_1001e8d6 = param_1[9];
            DAT_1001e8d7 = param_1[10];
            DAT_1001e8d8 = param_1[0xb];
          }
          uVar10 = FUN_1000c190(extraout_ECX_02,0xd,0xe);
          if ((char)uVar10 == param_1[0xe]) {
            DAT_1001e8d9 = param_1[0xd];
          }
        }
      }
      *param_2 = 0;
      puVar6 = DAT_10023190;
      local_28 = *(undefined4 *)((int)DAT_10023190 + 3);
      uStack_20 = *(undefined4 *)((int)DAT_10023190 + 0xb);
      uStack_1c = *(undefined4 *)((int)DAT_10023190 + 0xf);
      local_18 = *(char *)((int)DAT_10023190 + 0x13);
      uVar10 = *(undefined4 *)(param_1 + 4);
      uVar3 = *(undefined4 *)(param_1 + 8);
      uVar4 = *(undefined4 *)(param_1 + 0xc);
      uStack_24._2_2_ = (undefined2)((uint)*(undefined4 *)((int)DAT_10023190 + 7) >> 0x10);
      uStack_24._0_2_ = CONCAT11(param_1[5],(char)*(undefined4 *)((int)DAT_10023190 + 7));
      *(undefined4 *)((int)DAT_10023190 + 3) = *(undefined4 *)param_1;
      *(undefined4 *)((int)puVar6 + 7) = uVar10;
      *(undefined4 *)((int)puVar6 + 0xb) = uVar3;
      *(undefined4 *)((int)puVar6 + 0xf) = uVar4;
      *(char *)((int)puVar6 + 0x13) = param_1[0x10];
      FUN_10006250(&DAT_1002319c,DAT_10023190);
      memmove(DAT_10023190,DAT_10023190 + 5,DAT_10023194 - (int)(DAT_10023190 + 5));
      DAT_10023194 = DAT_10023194 + -0x14;
      if (*(char *)(DAT_100231a0 + -0x14) == '\0') goto LAB_1000e10d;
      iVar13 = 0;
      memset(&DAT_10021160,0,0x2000);
      if ((DAT_100231a0 - DAT_1002319c >> 2) * -0x33333333 != 0) {
        iVar9 = 0;
        pbVar11 = &DAT_10021160;
        iVar12 = (DAT_100231a0 - DAT_1002319c >> 2) * -0x33333333;
        do {
          iVar7 = DAT_1002319c;
          bVar14 = DAT_1001e881 != '\0';
          *(undefined8 *)pbVar11 = *(undefined8 *)(DAT_1002319c + 9 + iVar9);
          *(undefined2 *)(pbVar11 + 8) = *(undefined2 *)(iVar7 + 0x11 + iVar9);
          bVar8 = *(byte *)(DAT_1002319c + 8 + iVar9);
          if (bVar14) {
            bVar8 = bVar8 & 0x7f;
          }
          iVar9 = iVar9 + 0x14;
          iVar13 = iVar13 + (uint)bVar8;
          pbVar11 = pbVar11 + 10;
          iVar12 = iVar12 + -1;
        } while (iVar12 != 0);
      }
      cVar2 = *(char *)(DAT_100231a0 + -0x12);
      bVar14 = true;
      if (DAT_1002319c == DAT_100231a0) goto LAB_1000e10d;
      DAT_100231a0 = DAT_1002319c;
      _Mtx_unlock(&DAT_10023160);
      this = extraout_ECX_03;
    }
    if ((byte)(cVar2 - 1U) < 0x50) {
      FUN_10005d30(this,this,cVar2);
      FUN_10013806(local_14 ^ (uint)&stack0xfffffff0);
      return;
    }
    if (iVar13 < 0xb) {
      if (param_1[1] == '\x04') {
        iVar13 = 4;
        if (DAT_1001c071 != '\0') {
          FUN_10005ab0(&DAT_1001c070,DAT_1001c070,DAT_10021154,'\x01');
          FUN_10013806(local_14 ^ (uint)&stack0xfffffff0);
          return;
        }
      }
      else if (param_1[1] == '\x03') {
        iVar13 = 4;
      }
    }
    if (DAT_10021154 == (code *)0x0) goto LAB_1000e1b5;
  }
  (*DAT_10021154)(&local_28,0x11,&DAT_10021160,iVar13);
LAB_1000e1b5:
  FUN_10013806(local_14 ^ (uint)&stack0xfffffff0);
  return;
}


//==== FUN_10005ab0 @ 10005ab0

void __thiscall FUN_10005ab0(void *this,char param_1,undefined *param_2,char param_3)

{
  __time64_t local_3c;
  undefined4 local_30;
  undefined4 local_2c;
  undefined4 local_28;
  undefined4 local_24;
  undefined1 local_20;
  char local_1c;
  undefined1 local_1b;
  undefined1 local_1a;
  undefined1 local_19;
  undefined4 local_18;
  undefined4 local_14;
  undefined4 local_10;
  undefined1 local_c;
  uint local_8;
  
  local_8 = DAT_1001c004 ^ (uint)&stack0xfffffffc;
  if (((*(char *)((int)this + 0xcd) != param_1) ||
      ((bool)*(char *)((int)this + 0xce) != (*(char *)((int)this + 0xb1) != '\0'))) ||
     (param_3 != '\0')) {
    local_1b = *(undefined1 *)((int)this + 0xb1);
    local_30 = 0x408;
    local_2c = 0x200;
    local_28 = 0;
    local_24 = 0;
    local_20 = 0x49;
    local_18 = 0;
    local_14 = 0;
    local_10 = 0;
    local_c = 0;
    local_1c = param_1;
    local_1a = (undefined1)((ushort)*(undefined2 *)((int)this + 0xb2) >> 8);
    local_19 = (undefined1)*(undefined2 *)((int)this + 0xb2);
    if (((*(char *)((int)this + 0xcd) != param_1) && (*(char *)((int)this + 0xbb) != '\0')) &&
       (*(char *)((int)this + 1) != '\0')) {
      _time64(&local_3c);
      FUN_10005040((int)this);
    }
    *(char *)((int)this + 0xcd) = param_1;
    *(bool *)((int)this + 0xce) = *(char *)((int)this + 0xb1) != '\0';
    if (param_2 != (undefined *)0x0) {
      (*(code *)param_2)(&local_30,0x11,&local_1c,4);
    }
  }
  FUN_10013806(local_8 ^ (uint)&stack0xfffffffc);
  return;
}


