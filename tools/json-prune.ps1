# JSON 파일에서 항목만 지워요 (줄바꿈·들여쓰기 같은 서식은 그대로 두고 해당 부분만 잘라내요)
#   -Keys    : 이 이름의 속성(키)을 어느 깊이에 있든 지워요  예) 장소 id 로 된 키
#   -ArrayIds: 배열 안의 객체 중 "id" 값이 이 목록에 있는 것을 지워요  예) spots.json 의 spots
# 예) powershell -File tools/json-prune.ps1 -Path data/parking.json -Keys a,b,c
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string[]]$Keys = @(),
  [string[]]$ArrayIds = @()
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Text;
public class JsonPruner {
  string t; HashSet<string> keys, ids; public int Removed;
  public JsonPruner(HashSet<string> k, HashSet<string> i) { keys = k; ids = i; }
  public string Run(string text) { t = text; int end; string idv; string r = Value(0, out end, out idv); return t.Substring(0, FirstNonWs(0)) + r + t.Substring(end); }
  int FirstNonWs(int i) { while (i < t.Length && (char.IsWhiteSpace(t[i]) || t[i] == '﻿')) i++; return i; }
  string Str(int i, out int end, out string val) {
    int s = i; i++; StringBuilder sb = new StringBuilder();
    while (t[i] != '"') { if (t[i] == '\\') { sb.Append(t[i]); i++; } sb.Append(t[i]); i++; }
    end = i + 1; val = sb.ToString(); return t.Substring(s, end - s);
  }
  string Value(int i, out int end, out string idv) {
    idv = null; i = FirstNonWs(i); char c = t[i];
    if (c == '{') return Obj(i, out end, out idv);
    if (c == '[') return Arr(i, out end);
    if (c == '"') { string v; return Str(i, out end, out v); }
    int j = i; while (j < t.Length && ",]} \t\r\n".IndexOf(t[j]) < 0) j++;
    end = j; return t.Substring(i, j - i);
  }
  class Member { public int Start, End; public string Text, Key; }
  string Obj(int open, out int end, out string idv) {
    idv = null; List<Member> ms = new List<Member>(); int i = open + 1;
    while (true) {
      i = FirstNonWs(i); if (t[i] == '}') break; if (t[i] == ',') { i++; continue; }
      Member m = new Member(); m.Start = i; int e; string key; Str(i, out e, out key); m.Key = key; i = FirstNonWs(e);
      i++; /* ':' */ int ve; string vid; string v = Value(i, out ve, out vid);
      m.Text = t.Substring(m.Start, FirstNonWs(i) - m.Start) + v; m.End = ve; i = ve; ms.Add(m);
      if (key == "id" && v.Length > 1 && v[0] == '"') idv = v.Substring(1, v.Length - 2);
    }
    end = i + 1; int tail = i; // '}' 위치
    if (ms.Count == 0) return t.Substring(open, end - open);
    List<int> kept = new List<int>();
    for (int k = 0; k < ms.Count; k++) { if (keys.Contains(ms[k].Key)) Removed++; else kept.Add(k); }
    StringBuilder sb = new StringBuilder(); sb.Append(t.Substring(open, ms[0].Start - open));
    for (int n = 0; n < kept.Count; n++) {
      if (n > 0) { int p = kept[n - 1]; string sep = p + 1 < ms.Count ? t.Substring(ms[p].End, ms[p + 1].Start - ms[p].End) : ", "; sb.Append(sep); }
      sb.Append(ms[kept[n]].Text);
    }
    sb.Append(t.Substring(ms[ms.Count - 1].End, tail - ms[ms.Count - 1].End)); sb.Append('}');
    return sb.ToString();
  }
  string Arr(int open, out int end) {
    List<int> starts = new List<int>(), ends = new List<int>(); List<string> texts = new List<string>(); List<bool> drop = new List<bool>();
    int i = open + 1;
    while (true) {
      i = FirstNonWs(i); if (t[i] == ']') break; if (t[i] == ',') { i++; continue; }
      int ve; string vid; string v = Value(i, out ve, out vid);
      starts.Add(i); ends.Add(ve); texts.Add(v); drop.Add(vid != null && ids.Contains(vid)); i = ve;
    }
    end = i + 1; int tail = i;
    if (starts.Count == 0) return t.Substring(open, end - open);
    List<int> kept = new List<int>();
    for (int k = 0; k < starts.Count; k++) { if (drop[k]) Removed++; else kept.Add(k); }
    StringBuilder sb = new StringBuilder(); sb.Append(t.Substring(open, starts[0] - open));
    for (int n = 0; n < kept.Count; n++) {
      if (n > 0) { int p = kept[n - 1]; string sep = p + 1 < starts.Count ? t.Substring(ends[p], starts[p + 1] - ends[p]) : ", "; sb.Append(sep); }
      sb.Append(texts[kept[n]]);
    }
    sb.Append(t.Substring(ends[ends.Count - 1], tail - ends[ends.Count - 1])); sb.Append(']');
    return sb.ToString();
  }
}
'@
$full = (Resolve-Path $Path).Path
$bytes = [IO.File]::ReadAllBytes($full)
$bom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
$text = [Text.Encoding]::UTF8.GetString($bytes); if ($bom) { $text = $text.Substring(1) }
$k = New-Object 'System.Collections.Generic.HashSet[string]'; foreach ($x in $Keys) { [void]$k.Add($x) }
$i = New-Object 'System.Collections.Generic.HashSet[string]'; foreach ($x in $ArrayIds) { [void]$i.Add($x) }
$p = New-Object JsonPruner($k, $i)
$out = $p.Run($text)
# 결과가 올바른 JSON 인지 확인한 뒤에만 써요
$null = $out | ConvertFrom-Json
$enc = New-Object System.Text.UTF8Encoding($bom)
[IO.File]::WriteAllText($full, $out, $enc)
"$Path : $($p.Removed)개 지움"
