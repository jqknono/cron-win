import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Check, X, AlertCircle, Info } from 'lucide-react';
import { ScheduledTaskImportInfo } from '../utils/taskGenerator';

interface ImportCommandCardProps {
  importInfo: ScheduledTaskImportInfo;
}

export const ImportCommandCard: React.FC<ImportCommandCardProps> = ({ importInfo }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(importInfo.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className="output-container">
      <div className="output-header">
        <h3 className="output-title output-title--static">
          <span className="title-content">
            {t('output.xmlImportScriptTitle')}
          </span>
        </h3>
      </div>
      <div className="command-text">
        <h4>{t('output.importMethodsTitle')}</h4>
        <ol className="import-methods">
          <li>
            <strong>{t('output.importMethod1Title')}</strong> {t('output.importMethod1Description')}
            <div className="command-line-wrapper" style={{ marginTop: '10px' }}>
              <pre className="command-line user-select-text">
                <code>taskschd.msc</code>
              </pre>
            </div>
          </li>
          <li>
            <strong>{t('output.importMethod2Title')}</strong> {t('output.importMethod2Description')}
            <p className="command-text__warning" style={{ marginTop: '8px' }}>{t('adminWarning.message')}</p>
            <div className="command-line-wrapper" style={{ marginTop: '10px' }}>
              <pre className="command-line user-select-text">
                <code>{importInfo.command}</code>
              </pre>
              <button
                className="copy-button copy-button--inline"
                onClick={copyToClipboard}
              >
                {copied ? t('output.copied') : t('output.copyCommand')}
              </button>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

interface XmlConfigCardProps {
  xmlContent: string;
  taskName: string;
  usePowershell: boolean;
  onUsePowershellChange: (value: boolean) => void;
  taskConfig?: {
    appPath?: string;
    repeatInterval?: string;
    repeatIntervalUnit?: string;
    triggerType?: string;
  };
}

export const XmlConfigCard: React.FC<XmlConfigCardProps> = ({ xmlContent, taskName, usePowershell, onUsePowershellChange, taskConfig }) => {
  const { t, i18n } = useTranslation();
  // 移除了折叠功能，始终显示XML内容
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableXml, setEditableXml] = useState(xmlContent);
  const [xmlValid, setXmlValid] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditableXml(xmlContent);
  }, [xmlContent]);


  const trackDownload = async () => {
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/track-download'
      : 'https://cronwin.techfetch.dev/api/track-download';
    
    const payload = {
      taskName,
      appPath: taskConfig?.appPath || '',
      repeatInterval: taskConfig?.repeatInterval || '',
      repeatIntervalUnit: taskConfig?.repeatIntervalUnit || '',
      triggerType: taskConfig?.triggerType || '',
      usePowershell,
      userAgent: navigator.userAgent,
      language: i18n.language
    };

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // 静默失败，不影响用户体验
    });
  };

  const downloadXML = () => {
    const contentToDownload = isEditing ? editableXml : xmlContent;
    const toUtf16LeBytes = (s: string) => {
      const bytes = new Uint8Array(2 + s.length * 2);
      // UTF-16 LE BOM
      bytes[0] = 0xff; bytes[1] = 0xfe;
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        bytes[2 + i * 2] = code & 0xff;
        bytes[2 + i * 2 + 1] = code >> 8;
      }
      return bytes;
    };
    const blob = new Blob([toUtf16LeBytes(contentToDownload)], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${taskName.replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
    
    // 追踪下载（异步，不阻塞）
    trackDownload();
  };

  const validateXML = (xml: string): boolean => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const errorNode = doc.getElementsByTagName('parsererror');
      return errorNode.length === 0;
    } catch (e) {
      return false;
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // 保存编辑
      if (validateXML(editableXml)) {
        setIsEditing(false);
        setXmlValid(true);
      } else {
        setXmlValid(false);
        setShowValidation(true);
      }
    } else {
      // 开始编辑
      setIsEditing(true);
      setShowValidation(false);
    }
  };

  const handleCancelEdit = () => {
    setEditableXml(xmlContent);
    setIsEditing(false);
    setXmlValid(true);
    setShowValidation(false);
  };

  const handleXmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newXml = e.target.value;
    setEditableXml(newXml);
    if (showValidation) {
      setXmlValid(validateXML(newXml));
    }
  };

  const formatXML = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(editableXml, 'text/xml');
      const serializer = new XMLSerializer();
      let formatted = serializer.serializeToString(doc.documentElement);
      
      // 添加缩进
      formatted = formatted.replace(/></g, '>\n<');
      const lines = formatted.split('\n');
      let indentLevel = 0;
      const formattedLines = lines.map(line => {
        if (line.includes('</')) {
          indentLevel--;
        }
        const indentedLine = '  '.repeat(Math.max(0, indentLevel)) + line;
        if (line.includes('<') && !line.includes('</') && !line.includes('/>')) {
          indentLevel++;
        }
        return indentedLine;
      });
      
      const formattedXml = `<?xml version="1.0" encoding="UTF-16"?>\n${formattedLines.join('\n')}`;
      setEditableXml(formattedXml);
      if (showValidation) {
        setXmlValid(validateXML(formattedXml));
      }
    } catch (e) {
      console.error('XML格式化失败:', e);
    }
  };

  return (
    <div className="output-container">
      <div className="output-header">
        <h3 className="output-title output-title--static">
          <span className="title-content">
            {t('output.xmlTitle')}
          </span>
        </h3>
        <div className="output-actions">
          <label className="checkbox-group" title={t('action.usePowershellHint')} style={{ padding: '6px 10px' }}>
            <input
              type="checkbox"
              checked={usePowershell}
              onChange={(e) => onUsePowershellChange(e.target.checked)}
            />
            <span>{t('action.usePowershell')}</span>
          </label>
          <button
            className="icon-button"
            onClick={handleEditToggle}
            title={isEditing ? t('output.saveEdit') : t('output.editXml')}
          >
            {isEditing ? <Check size={16} /> : <Edit size={16} />}
          </button>
          {isEditing && (
            <button
              className="icon-button icon-button--danger"
              onClick={handleCancelEdit}
              title={t('output.cancelEdit')}
            >
              <X size={16} />
            </button>
          )}
          <button
            className="download-button"
            onClick={downloadXML}
          >
            {downloadSuccess ? t('output.downloadSuccess') : t('output.downloadXml')}
          </button>
        </div>
      </div>
      
      <div className="xml-container">
          {/* XML 信息面板 */}
          <div className="xml-info-panel">
            <div className="xml-info-section">
              <div className="xml-info-title">
                <Info size={14} />
                <span>{t('output.xmlInfo')}</span>
              </div>
              <div className="xml-info-content">
                <div className="xml-info-item">
                  <span className="xml-info-label">{t('output.taskName')}:</span>
                  <span className="xml-info-value">{taskName}</span>
                </div>
                <div className="xml-info-item">
                  <span className="xml-info-label">{t('output.fileSize')}:</span>
                  <span className="xml-info-value">{(new Blob([xmlContent]).size / 1024).toFixed(2)} KB</span>
                </div>
                <div className="xml-info-item">
                  <span className="xml-info-label">{t('output.encoding')}:</span>
                  <span className="xml-info-value">UTF-16</span>
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="xml-info-section">
                <div className="xml-info-title">
                  <AlertCircle size={14} />
                  <span>{t('output.editTools')}</span>
                </div>
                <div className="xml-edit-tools">
                  <button
                    className="tool-button"
                    onClick={formatXML}
                    title={t('output.format')}
                  >
                    {t('output.format')}
                  </button>
                  <button
                    className="tool-button"
                    onClick={() => {
                      setShowValidation(true);
                      setXmlValid(validateXML(editableXml));
                    }}
                    title={t('output.validate')}
                  >
                    {t('output.validate')}
                  </button>
                </div>
                {showValidation && (
                  <div className={`xml-validation ${xmlValid ? 'valid' : 'invalid'}`}>
                    {xmlValid ? t('output.validXml') : t('output.invalidXml')}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* XML 显示区域 */}
          <div className="xml-display-area">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                className="code-textarea"
                value={editableXml}
                onChange={handleXmlChange}
                style={{ fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace' }}
              />
            ) : (
              <div className="code-block">
                {xmlContent}
              </div>
            )}
          </div>
        </div>
    </div>
  );
};
