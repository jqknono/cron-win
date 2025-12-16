import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskSchedulerForm } from './components/TaskSchedulerForm';
import { ImportCommandCard, XmlConfigCard } from './components/OutputDisplay';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { SEO } from './components/SEO';
import { generateScheduledTaskImportCommand, generateXML } from './utils/taskGenerator';

export interface TaskConfig {
  taskName: string;
  description: string;
  action: 'start_program';
  // 要执行的应用程序绝对路径（用户输入，必须为绝对路径）
  appPath: string;
  arguments: string;
  workingDirectory: string;
  // 执行器路径（可选覆盖，默认使用 Windows PowerShell）
  shellPath: string;
  triggerType: 'daily' | 'weekly' | 'monthly' | 'once' | 'on_startup' | 'on_logon' | 'on_idle' | 'startup_and_logon';
  startDate: string;
  startTime: string;
  repeatInterval: string;
  repeatIntervalUnit: 'minutes' | 'hours' | 'days';
  daysOfWeek: string[];
  months: string[];
  daysOfMonth: string[];
  enabled: boolean;
  runWithHighestPrivileges: boolean;
  userAccount: string;
  hidden: boolean;
  allowDemandStart: boolean;
  startWhenAvailable: boolean;
  runOnlyIfNetworkAvailable: boolean;
  wakeToRun: boolean;
  stopIfGoingOnBatteries: boolean;
  disallowStartIfOnBatteries: boolean;
  restartOnFailure: boolean;
  restartInterval: string;
  restartCount: number;
  usePowershell: boolean;
}

const defaultTaskConfig: TaskConfig = {
  taskName: 'My Scheduled Task',
  description: 'Task created by Windows Task Scheduler Generator',
  action: 'start_program',
  appPath: '',
  arguments: '',
  workingDirectory: '',
  shellPath: '',
  triggerType: 'startup_and_logon',
  startDate: new Date().toISOString().split('T')[0],
  startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
  repeatInterval: '1',
  repeatIntervalUnit: 'hours',
  daysOfWeek: [],
  months: [],
  daysOfMonth: [],
  enabled: true,
  runWithHighestPrivileges: true,
  userAccount: 'SYSTEM',
  hidden: true,
  allowDemandStart: true,
  startWhenAvailable: false,
  runOnlyIfNetworkAvailable: false,
  wakeToRun: false,
  stopIfGoingOnBatteries: true,
  disallowStartIfOnBatteries: true,
  restartOnFailure: false,
  restartInterval: 'PT5M',
  restartCount: 3,
  usePowershell: false,
};

function App() {
  const { t } = useTranslation();
  const [taskConfig, setTaskConfig] = useState<TaskConfig>(defaultTaskConfig);

  const importInfo = generateScheduledTaskImportCommand(taskConfig, t);
  const xmlContent = generateXML(taskConfig);

  return (
    <div className="container">
      <SEO />
      <div className="header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
        <LanguageSwitcher />
      </div>
      
      <div className="content-area">
        <div className="content-column">
          <TaskSchedulerForm
            taskConfig={taskConfig}
            onConfigChange={setTaskConfig}
          />
          
          <ImportCommandCard importInfo={importInfo} />
        </div>

        <div className="content-column">
          <XmlConfigCard
            xmlContent={xmlContent}
            taskName={taskConfig.taskName}
            usePowershell={taskConfig.usePowershell}
            onUsePowershellChange={(value) => setTaskConfig({ ...taskConfig, usePowershell: value })}
            taskConfig={{
              appPath: taskConfig.appPath,
              repeatInterval: taskConfig.repeatInterval,
              repeatIntervalUnit: taskConfig.repeatIntervalUnit,
              triggerType: taskConfig.triggerType
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
