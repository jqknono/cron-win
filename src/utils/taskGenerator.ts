import { TaskConfig } from '../App';
import { TFunction } from 'i18next';

// 根据单位和数值生成PowerShell时间间隔参数 (保留用于可能的未来使用)
// function generateRepetitionInterval(config: TaskConfig): string {
//   const interval = parseInt(config.repeatInterval) || 1;
//   if (config.repeatIntervalUnit === 'days') {
//     return `(New-TimeSpan -Days ${interval})`;
//   } else {
//     return `(New-TimeSpan -Minutes ${interval})`;
//   }
// }

// 根据单位和数值生成XML时间间隔格式
function generateXMLInterval(config: TaskConfig): string {
  const interval = parseInt(config.repeatInterval) || 1;
  if (config.repeatIntervalUnit === 'days') {
    return `P${interval}D`;
  } else if (config.repeatIntervalUnit === 'hours') {
    return `PT${interval}H`;
  } else {
    return `PT${interval}M`;
  }
}

// 生成 XML 中 Repetition 的 Duration。按照微软官方文档：
// - Duration 元素可省略（minOccurs="0"）；若省略则表示无限期（Indefinitely）。
// - 若提供数值，最小值为 PT1M（1 分钟）。
// 因此，为了“默认无限期”，此函数返回空字符串，调用方据此省略 <Duration>。
function generateXMLDuration(_config: TaskConfig): string {
  return '';
}

// 将字符串转为 PowerShell 单引号字面量，转义内部单引号
function psStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// PowerShell 的 -EncodedCommand 需要 UTF-16LE 编码后再 Base64
function encodeToBase64Utf16LE(text: string): string {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const codeUnit = text.charCodeAt(i);
    bytes[i * 2] = codeUnit & 0xff;
    bytes[i * 2 + 1] = codeUnit >> 8;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getShellPath(): string {
  return 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
}

function buildEncodedScript(config: TaskConfig): string {
  const exeLiteral = psStringLiteral(config.appPath || '');
  const argsLiteral = psStringLiteral(config.arguments || '');
  const wdLiteral = config.workingDirectory ? psStringLiteral(config.workingDirectory) : '$null';

  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$exe = ${exeLiteral}`,
    `$args = ${argsLiteral}`,
    `$wd = ${wdLiteral}`,
    "if (-not [System.IO.Path]::IsPathRooted($exe)) { throw '应用程序路径必须是绝对路径' }",
    "$startParams = @{ FilePath = $exe }",
    "if ($args -and $args.Trim().Length -gt 0) { $startParams['ArgumentList'] = $args }",
    "if ($wd -ne $null -and $wd.Trim().Length -gt 0) { $startParams['WorkingDirectory'] = $wd }",
    'Start-Process @startParams'
  ].join('\n');

  return encodeToBase64Utf16LE(script);
}

function buildShellAndArgs(config: TaskConfig): { shellPath: string; shellArgs: string } {
  const shellPath = (config.shellPath && config.shellPath.trim().length > 0)
    ? config.shellPath
    : getShellPath();
  const encoded = buildEncodedScript(config);
  const commonFlags = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand';
  const shellArgs = `${commonFlags} ${encoded}`;
  return { shellPath, shellArgs };
}

// XML 转义
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 去除首尾成对引号（支持 ' 或 "）
function stripOuterQuotes(s: string): string {
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// 将一行命令拆分为 可执行文件 + 参数（尊重双引号包裹的第一个token）
function splitCommandAndArgs(raw: string): { command: string; args: string } {
  let s = raw.trim();
  if (!s) return { command: '', args: '' };

  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end > 0) {
      const command = s.slice(1, end);
      const rest = s.slice(end + 1).trim();
      return { command, args: rest };
    }
  }
  // 不以引号开始或未找到闭合引号：取第一个空格前为可执行文件
  const firstSpace = s.indexOf(' ');
  if (firstSpace === -1) {
    return { command: stripOuterQuotes(s), args: '' };
  }
  const command = stripOuterQuotes(s.slice(0, firstSpace));
  const args = s.slice(firstSpace + 1).trim();
  return { command, args };
}

function buildDirectExec(config: TaskConfig): { commandPath: string; args: string; workingDir?: string } {
  const rawExe = config.appPath || '';
  const manualArgs = (config.arguments || '').trim();
  let commandPath = '';
  let args = '';

  if (manualArgs) {
    commandPath = stripOuterQuotes(rawExe);
    args = manualArgs;
  } else {
    const { command, args: autoArgs } = splitCommandAndArgs(rawExe);
    commandPath = command;
    args = autoArgs;
  }

  return { commandPath, args, workingDir: config.workingDirectory?.trim() || undefined };
}

export interface ScheduledTaskImportInfo {
  adminWarning: string;
  downloadsPathLine: string;
  runCommandLine: string;
  command: string;
  schedulerHint: string;
}

export function generateScheduledTaskImportCommand(
  config: TaskConfig,
  t?: TFunction
): ScheduledTaskImportInfo {
  const trimmedTaskName = config.taskName.trim() || 'MyScheduledTask';
  const normalizedTaskName = trimmedTaskName.replace(/^\\+/, '');
  const baseTaskName = normalizedTaskName.length > 0 ? normalizedTaskName : 'MyScheduledTask';
  const commandTaskName = `\\${baseTaskName}`;

  const sanitizedFileName =
    `${baseTaskName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') || 'ScheduledTask'}.xml`;
  const downloadsPath = `%USERPROFILE%\\Downloads\\${sanitizedFileName}`;

  // 如果选择“当前用户”，我们在导入时用 PowerShell 将占位符替换为当前用户 SID，
  // 并写入临时 UTF-16（Unicode）文件再调用 schtasks 导入，避免 %USERNAME% 之类变量无法被 XML 解析的问题。
  const command = (config.userAccount === 'CURRENT_USER')
    ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "$src=$env:USERPROFILE + '\\Downloads\\${sanitizedFileName}'; $dst=Join-Path $env:TEMP '${sanitizedFileName}'; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; (Get-Content -LiteralPath $src -Raw).Replace('__CURRENT_USER_SID__', $sid) | Set-Content -LiteralPath $dst -Encoding Unicode; schtasks /create /tn '${commandTaskName}' /xml $dst /f"`
    : `schtasks /create /tn "${commandTaskName}" /xml "${downloadsPath}" /f`;

  const tr = (key: string, defaultText: string, options?: Record<string, unknown>) =>
    t ? t(key, options) : defaultText;

  const adminWarning = t
    ? t('adminWarning.message')
    : 'Please ensure you run this command as Administrator.';
  const downloadsPathLine = tr(
    'scriptComments.downloadsPathLine',
    `XML file saved in the common Downloads folder: ${downloadsPath}`,
    { path: downloadsPath }
  );
  const runCommandLine = tr(
    'scriptComments.runCommandIntro',
    'Run the following command in an elevated Command Prompt or PowerShell:'
  );
  const schedulerHint = tr(
    'scriptComments.schedulerHint',
    'You can run taskschd.msc to open the Task Scheduler window.'
  );

  return {
    adminWarning,
    downloadsPathLine,
    runCommandLine,
    command,
    schedulerHint,
  };
}



export function generateXML(config: TaskConfig): string {
  const triggerXML = generateTriggerXML(config);
  const actionXML = generateActionXML(config);
  const settingsXML = generateSettingsXML(config);
  const principalXML = generatePrincipalXML(config);

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>${new Date().toISOString()}</Date>
    <Author>Windows Task Scheduler Generator</Author>
    <Description>${config.description}</Description>
  </RegistrationInfo>
  <Triggers>
    ${triggerXML}
  </Triggers>
  <Principals>
    ${principalXML}
  </Principals>
  <Settings>
    ${settingsXML}
  </Settings>
  <Actions Context="Author">
    ${actionXML}
  </Actions>
</Task>`;
}

function generateTriggerXML(config: TaskConfig): string {
  const enabled = config.enabled ? 'true' : 'false';
  const intervalIso = generateXMLInterval(config);
  const durationIso = generateXMLDuration(config);
  const durationTag = durationIso ? `\n        <Duration>${durationIso}</Duration>` : '';
  const stopAtTag = durationIso ? `\n        <StopAtDurationEnd>false</StopAtDurationEnd>` : '';
  
  switch (config.triggerType) {
    case 'startup_and_logon':
      return `<BootTrigger>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
    </BootTrigger>
    <LogonTrigger>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
    </LogonTrigger>`;
    case 'daily':
      return `
    <CalendarTrigger>
      <StartBoundary>${config.startDate}T${config.startTime}:00</StartBoundary>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>`;

    case 'weekly':
      return `<CalendarTrigger>
      <StartBoundary>${config.startDate}T${config.startTime}:00</StartBoundary>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
      <ScheduleByWeek>
        <DaysOfWeek>
          ${config.daysOfWeek.map(day => `<${day} />`).join('\n          ')}
        </DaysOfWeek>
        <WeeksInterval>1</WeeksInterval>
      </ScheduleByWeek>
    </CalendarTrigger>`;

    case 'monthly':
      return `<CalendarTrigger>
      <StartBoundary>${config.startDate}T${config.startTime}:00</StartBoundary>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
      <ScheduleByMonth>
        <DaysOfMonth>
          ${config.daysOfMonth.map(day => `<Day>${day}</Day>`).join('\n          ')}
        </DaysOfMonth>
        <Months>
          ${config.months.map(month => `<${month} />`).join('\n          ')}
        </Months>
      </ScheduleByMonth>
    </CalendarTrigger>`;

    case 'once':
      return `<TimeTrigger>
      <StartBoundary>${config.startDate}T${config.startTime}:00</StartBoundary>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
    </TimeTrigger>`;

    case 'on_startup':
      return ` <BootTrigger>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
    </BootTrigger>`;

    case 'on_logon':
      return `<LogonTrigger>
      <Enabled>${enabled}</Enabled>
      <Repetition>
        <Interval>${intervalIso}</Interval>${durationTag}${stopAtTag}
      </Repetition>
    </LogonTrigger>`;
    
    case 'on_idle':
      return `<IdleTrigger>
      <Enabled>${enabled}</Enabled>
    </IdleTrigger>`;
    
    default:
      return '';
  }
}

function generateActionXML(config: TaskConfig): string {
  if (config.usePowershell) {
    const { shellPath, shellArgs } = buildShellAndArgs(config);
    const argsEscaped = xmlEscape(shellArgs);
    return `<Exec>
      <Command>${xmlEscape(shellPath)}</Command>\n      <Arguments>${argsEscaped}</Arguments>
    </Exec>`;
  }

  const direct = buildDirectExec(config);
  const wdTag = direct.workingDir ? `\n      <WorkingDirectory>${xmlEscape(direct.workingDir)}</WorkingDirectory>` : '';
  return `<Exec>
      <Command>${xmlEscape(direct.commandPath)}</Command>\n      <Arguments>${xmlEscape(direct.args)}</Arguments>${wdTag}
    </Exec>`;
}

function generateSettingsXML(config: TaskConfig): string {
  const restartOnFailureSection = config.restartOnFailure ? `<RestartOnFailure>
      <Interval>${config.restartInterval}</Interval>
      <Count>${config.restartCount}</Count>
    </RestartOnFailure>` : '';

  return `<DisallowStartIfOnBatteries>${config.disallowStartIfOnBatteries}</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>${config.stopIfGoingOnBatteries}</StopIfGoingOnBatteries>
    <StartWhenAvailable>${config.startWhenAvailable}</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>${config.runOnlyIfNetworkAvailable}</RunOnlyIfNetworkAvailable>
    <WakeToRun>${config.wakeToRun}</WakeToRun>
    <Hidden>${config.hidden}</Hidden>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <AllowHardTerminate>true</AllowHardTerminate>${restartOnFailureSection}
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <Priority>7</Priority>`;
}

// 新版 Principal 生成：优先使用已知 SID（UserId 或 GroupId）。
function generatePrincipalXML(config: TaskConfig): string {
  const ua = (config.userAccount || '').toUpperCase();
  const runLevel = config.runWithHighestPrivileges ? 'HighestAvailable' : 'LeastPrivilege';

  let userId: string | null = null;
  let groupId: string | null = null;
  let logonType = 'S4U';

  switch (ua) {
    // 服务账户（内置）
    case 'SYSTEM':
      userId = 'S-1-5-18'; // LocalSystem
      logonType = 'ServiceAccount';
      break;
    case 'LOCAL_SERVICE':
      userId = 'S-1-5-19'; // LocalService
      logonType = 'ServiceAccount';
      break;
    case 'NETWORK_SERVICE':
      userId = 'S-1-5-20'; // NetworkService
      logonType = 'ServiceAccount';
      break;

    // 常见内置组（BUILTIN）
    case 'ADMINISTRATORS_GROUP':
      groupId = 'S-1-5-32-544'; // BUILTIN\\Administrators
      logonType = 'Group';
      break;
    case 'USERS_GROUP':
      groupId = 'S-1-5-32-545'; // BUILTIN\\Users
      logonType = 'Group';
      break;
    case 'GUESTS_GROUP':
      groupId = 'S-1-5-32-546'; // BUILTIN\\Guests
      logonType = 'Group';
      break;
    case 'REMOTE_DESKTOP_USERS':
      groupId = 'S-1-5-32-555'; // BUILTIN\\Remote Desktop Users
      logonType = 'Group';
      break;

    // 其他常见众所周知 SID 组
    case 'AUTHENTICATED_USERS':
      groupId = 'S-1-5-11';
      logonType = 'Group';
      break;
    case 'EVERYONE':
      groupId = 'S-1-1-0';
      logonType = 'Group';
      break;

    // 当前用户：在导入命令中替换占位符以得到具体 SID
    case 'CURRENT_USER':
      userId = '__CURRENT_USER_SID__';
      logonType = 'S4U';
      break;

    // 兼容旧值：若选择 Administrator（名称），仍按 S4U 输出名称；
    // 建议改为 ADMINISTRATORS_GROUP 使用已知组 SID。
    case 'ADMINISTRATOR':
      userId = 'Administrator';
      logonType = 'S4U';
      break;

    default:
      // 未识别则回退到 SYSTEM，确保可导入
      userId = 'S-1-5-18';
      logonType = 'ServiceAccount';
      break;
  }

  const idTag = groupId
    ? `<GroupId>${groupId}</GroupId>`
    : `<UserId>${userId}</UserId>`;

  // 为最大兼容性，SERVICE/GROUP 场景省略 <LogonType>；CURRENT_USER 保留 S4U。
  const logonTag = ua === 'CURRENT_USER' ? `\n      <LogonType>${logonType}</LogonType>` : '';
  return `<Principal id="Author">\n      ${idTag}${logonTag}\n      <RunLevel>${runLevel}</RunLevel>\n    </Principal>`;
}
