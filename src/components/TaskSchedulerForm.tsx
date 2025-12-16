import React from 'react';
import { useTranslation } from 'react-i18next';
import { TaskConfig } from '../App';

interface TaskSchedulerFormProps {
  taskConfig: TaskConfig;
  onConfigChange: (config: TaskConfig) => void;
}

export const TaskSchedulerForm: React.FC<TaskSchedulerFormProps> = ({ taskConfig, onConfigChange }) => {
  const { t } = useTranslation();
  const [customStartTimeEnabled, setCustomStartTimeEnabled] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const handleChange = (field: keyof TaskConfig, value: any) => {
    onConfigChange({ ...taskConfig, [field]: value });
  };

  const validateAbsolutePath = (value: string): boolean => {
    const driveLetter = /^[A-Za-z]:\\\\/;
    const unc = /^\\\\\\\\[^\\\\]+\\\\[^\\\\]+/;
    return driveLetter.test(value) || unc.test(value);
  };

  const handleArrayChange = (field: keyof TaskConfig, value: string) => {
    const currentArray = taskConfig[field] as string[];
    if (currentArray.includes(value)) {
      handleChange(field, currentArray.filter(item => item !== value));
    } else {
      handleChange(field, [...currentArray, value]);
    }
  };

  return (
    <div className="form-container">
      <h3 className="user-select-text">{t('form.basicInfo')}</h3>
      <div className="form-content">
        <div className="form-group">
          <label>{t('form.taskName')} *</label>
          <input
            type="text"
            value={taskConfig.taskName}
            onChange={(e) => handleChange('taskName', e.target.value)}
            placeholder={t('form.taskNamePlaceholder')}
          />
        </div>
        <div className="form-group">
          <label>{t('action.programCommand')} *</label>
          <input
            type="text"
            value={taskConfig.appPath}
            onChange={(e) => handleChange('appPath', e.target.value)}
            placeholder={t('action.programCommandPlaceholder')}
          />
        </div>
        {/* PowerShell 开关已移动至 XML 配置卡片头部 */}
        <div className="form-group">
          <label>{t('trigger.repeatInterval')}</label>
          <div className="input-group">
            <input
              type="number"
              min="1"
              value={taskConfig.repeatInterval}
              onChange={(e) => handleChange('repeatInterval', e.target.value)}
            />
            <select
              value={taskConfig.repeatIntervalUnit}
              onChange={(e) => handleChange('repeatIntervalUnit', e.target.value)}
            >
              <option value="minutes">{t('trigger.minutes')}</option>
              <option value="hours">{t('trigger.hours')}</option>
              <option value="days">{t('trigger.days')}</option>
            </select>
          </div>
        </div>
      </div>

      

      {/* Executor control moved to OutputDisplay header as toggle */}

      {/* 高级设置部分已隐藏 */}
      {false && (
      <div className="form-section">
        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('advanced.title')}</span>
          <button type="button" onClick={() => setAdvancedOpen(!advancedOpen)}>
            {advancedOpen ? t('advanced.collapse') : t('advanced.expand')}
          </button>
        </h3>
        {advancedOpen && (
        <div className="form-content">
        <div className="form-subsection">
          <h4>{t('trigger.title')}</h4>
          <div className="form-group">
            <label>{t('trigger.type')} *</label>
            <select
              value={taskConfig.triggerType}
              onChange={(e) => handleChange('triggerType', e.target.value)}
            >
              <option value="daily">{t('trigger.daily')}</option>
              <option value="weekly">{t('trigger.weekly')}</option>
              <option value="monthly">{t('trigger.monthly')}</option>
              <option value="once">{t('trigger.once')}</option>
              <option value="on_startup">{t('trigger.onStartup')}</option>
              <option value="startup_and_logon">{t('trigger.onStartupAndLogon')}</option>
              <option value="on_logon">{t('trigger.onLogon')}</option>
              <option value="on_idle">{t('trigger.onIdle')}</option>
            </select>
          </div>

          {/* 开始时间默认当前，改为放在高级设置中 */}

          {/* repeat interval moved to Basic Info */}

          {taskConfig.triggerType === 'weekly' && (
            <div className="form-group">
              <label>{t('trigger.selectWeekdays')}</label>
              <div className="weekday-grid">
                {[
                  { key: 'Sunday', label: t('trigger.sunday') },
                  { key: 'Monday', label: t('trigger.monday') },
                  { key: 'Tuesday', label: t('trigger.tuesday') },
                  { key: 'Wednesday', label: t('trigger.wednesday') },
                  { key: 'Thursday', label: t('trigger.thursday') },
                  { key: 'Friday', label: t('trigger.friday') },
                  { key: 'Saturday', label: t('trigger.saturday') }
                ].map(day => (
                  <label key={day.key} className="weekday-item">
                    <input
                      type="checkbox"
                      checked={taskConfig.daysOfWeek.includes(day.key)}
                      onChange={() => handleArrayChange('daysOfWeek', day.key)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {taskConfig.triggerType === 'monthly' && (
            <>
              <div className="form-group">
                <label>{t('trigger.selectMonths')}</label>
                <div className="month-grid">
                  {[
                    { key: 'January', label: t('trigger.january') },
                    { key: 'February', label: t('trigger.february') },
                    { key: 'March', label: t('trigger.march') },
                    { key: 'April', label: t('trigger.april') },
                    { key: 'May', label: t('trigger.may') },
                    { key: 'June', label: t('trigger.june') },
                    { key: 'July', label: t('trigger.july') },
                    { key: 'August', label: t('trigger.august') },
                    { key: 'September', label: t('trigger.september') },
                    { key: 'October', label: t('trigger.october') },
                    { key: 'November', label: t('trigger.november') },
                    { key: 'December', label: t('trigger.december') }
                  ].map(month => (
                    <label key={month.key} className="month-item">
                      <input
                        type="checkbox"
                        checked={taskConfig.months.includes(month.key)}
                        onChange={() => handleArrayChange('months', month.key)}
                      />
                      <span>{month.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>{t('trigger.selectDays')}</label>
                <div className="day-grid">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <label key={day} className="day-item">
                      <input
                        type="checkbox"
                        checked={taskConfig.daysOfMonth.includes(day.toString())}
                        onChange={() => handleArrayChange('daysOfMonth', day.toString())}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="form-group">
          <label>{t('form.description')}</label>
          <textarea
            value={taskConfig.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
          />
        </div>
        <div className="form-group">
          <label>{t('advanced.customStartTime')}</label>
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={customStartTimeEnabled}
              onChange={(e) => setCustomStartTimeEnabled(e.target.checked)}
            />
            <span>{t('advanced.customStartTimeHint')}</span>
          </div>
        </div>

        {customStartTimeEnabled && (
          <>
            <div className="form-group">
              <label>{t('trigger.startDate')}</label>
              <input
                type="date"
                value={taskConfig.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('trigger.startTime')}</label>
              <input
                type="time"
                value={taskConfig.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>{t('action.arguments')}</label>
          <input
            type="text"
            value={taskConfig.arguments}
            onChange={(e) => handleChange('arguments', e.target.value)}
            placeholder={t('action.argumentsPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label>{t('action.workingDirectory')}</label>
          <input
            type="text"
            value={taskConfig.workingDirectory}
            onChange={(e) => handleChange('workingDirectory', e.target.value)}
            placeholder={t('action.workingDirectoryPlaceholder')}
          />
        </div>
        <div className="form-group">
          <label>{t('advanced.executorPath')}</label>
          <input
            type="text"
            value={taskConfig.shellPath}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !validateAbsolutePath(v)) {
                return;
              }
              handleChange('shellPath', v);
            }}
            placeholder={t('advanced.executorPathPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label>{t('advanced.runAs')}</label>
          <select
            value={taskConfig.userAccount}
            onChange={(e) => handleChange('userAccount', e.target.value)}
          >
            <option value="SYSTEM">{t('advanced.system')}</option>
            <option value="CURRENT_USER">{t('advanced.currentUser')}</option>
            <option value="ADMINISTRATOR">{t('advanced.administrator')}</option>
          </select>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={taskConfig.runWithHighestPrivileges}
              onChange={(e) => handleChange('runWithHighestPrivileges', e.target.checked)}
            />
            <span>{t('advanced.runWithHighestPrivileges')}</span>
          </div>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={taskConfig.hidden}
              onChange={(e) => handleChange('hidden', e.target.checked)}
            />
            <span>{t('advanced.hidden')}</span>
          </div>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={taskConfig.startWhenAvailable}
              onChange={(e) => handleChange('startWhenAvailable', e.target.checked)}
            />
            <span>{t('advanced.startWhenAvailable')}</span>
          </div>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={taskConfig.wakeToRun}
              onChange={(e) => handleChange('wakeToRun', e.target.checked)}
            />
            <span>{t('advanced.wakeToRun')}</span>
          </div>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={taskConfig.restartOnFailure}
              onChange={(e) => handleChange('restartOnFailure', e.target.checked)}
            />
            <span>{t('advanced.restartOnFailure')}</span>
          </div>
        </div>

        {taskConfig.restartOnFailure && (
          <>
            <div className="form-group">
              <label>{t('advanced.restartInterval')}</label>
              <input
                type="text"
                value={taskConfig.restartInterval}
                onChange={(e) => handleChange('restartInterval', e.target.value)}
                placeholder={t('advanced.restartIntervalPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('advanced.restartCount')}</label>
              <input
                type="number"
                min="0"
                max="10"
                value={taskConfig.restartCount}
                onChange={(e) => handleChange('restartCount', parseInt(e.target.value))}
              />
            </div>
          </>
        )}
        </div>
        )}
      </div>
      )}
    </div>
  );
};
