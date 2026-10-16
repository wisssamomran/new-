import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import {
  Settings,
  Shield,
  Users,
  Database,
  History,
  CheckCircle,
  AlertTriangle,
  Search,
  Lock,
  Layers,
  Building,
  RotateCcw
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { auditLogs, listings, organizations, reports, tickets, resetToInitialData, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'audit' | 'dictionary' | 'stats' | 'security'>('audit');
  const [auditSearch, setAuditSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase().trim();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchDetails) return false;
    }
    if (filterAction !== 'all' && log.targetType !== filterAction) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-1">
            <Settings className="w-3.5 h-3.5 text-[#12A889]" />
            <span>لوحة إدارة النظام وسجل التدقيق الإداري</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#16324F]">الرقابة الإدارية وسجل الأحداث (Audit Trail)</h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل مركزي غير قابل للتلاعب لجميع القرارات والعمليات الإدارية الحساسة وفق مبادئ الحوكمة الرقمية
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2">
          {[
            { tab: 'audit', label: 'سجل التدقيق (Audit Logs)' },
            { tab: 'dictionary', label: 'قاموس محافظات ومدن اليمن' },
            { tab: 'stats', label: 'مؤشرات النظام' },
            { tab: 'security', label: 'ضوابط الأمان' }
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === item.tab
                  ? 'bg-[#16324F] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security & Anti-SQL Injection Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 text-xs border border-slate-800">
        <Lock className="w-5 h-5 text-[#12A889] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#12A889]">حماية الإنتاج ومنع أدوات التشغيل الخطرة: </span>
          تم استبعاد محررات SQL المباشرة وكلمات المرور وأسرار الربط من واجهات الويب امتثالاً للفقرة السادسة من وثيقة
          المتطلبات. تُسجل جميع العمليات الإدارية وتغييرات الحالات في السجل الرقابي بالوقت واسم المنفذ وسبب القرار.
        </div>
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="بحث في السجل بالعملية أو المستخدم..."
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 text-xs w-full md:w-auto">
              <span className="text-slate-500 font-bold">تصفية بنوع الهدف:</span>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              >
                <option value="all">كل الأهداف</option>
                <option value="listing">الإعلانات العقارية</option>
                <option value="verification">طلبات التحقق</option>
                <option value="report">البلاغات والقضايا</option>
                <option value="user">المستخدمين والأدوار</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">الوقت والتاريخ</th>
                    <th className="p-3.5">المستخدم والصفة</th>
                    <th className="p-3.5">العملية الإدارية</th>
                    <th className="p-3.5">النوع والمعرف</th>
                    <th className="p-3.5">النتيجة</th>
                    <th className="p-3.5">التفاصيل والسبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3.5 font-bold text-[#16324F]">
                        {log.userName}
                        <span className="block text-[10px] text-slate-400 font-normal">({log.userRole})</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{log.action}</td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {log.targetType} <span className="text-[10px]">({log.targetId})</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.result === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.result === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.result === 'success' ? 'نجحت' : log.result === 'warning' ? 'تنبيه' : 'مرفوضة'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Yemeni Dictionary */}
      {activeTab === 'dictionary' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="font-bold text-base text-[#16324F] mb-1">قاموس التقسيم الإداري والجغرافي المعتمد لليمن</h3>
            <p className="text-xs text-slate-500">
              المحافظات والمدن والأحياء اليمنية المعتمدة في خيارات البحث ومعالج إضافة العقار
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {YEMEN_GOVERNORATES.map(gov => (
              <div key={gov.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-sm text-[#16324F]">{gov.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {gov.lat.toFixed(2)}°, {gov.lng.toFixed(2)}°
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {gov.cities.map(c => (
                    <div key={c.name} className="space-y-1">
                      <span className="font-bold text-slate-800 block text-xs">مدينة {c.name}:</span>
                      <div className="flex flex-wrap gap-1">
                        {c.districts.map(d => (
                          <span key={d} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Stats */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 text-xs block mb-1">إجمالي الإعلانات العقارية</span>
            <span className="text-3xl font-black text-[#16324F]">{listings.length}</span>
            <span className="text-[11px] text-emerald-600 block mt-1">
              منها {listings.filter(l => l.status === 'published').length} معتمد ونشط للعامة
            </span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 text-xs block mb-1">المنشآت والمكاتب المسجلة</span>
            <span className="text-3xl font-black text-indigo-600">{organizations.length}</span>
            <span className="text-[11px] text-slate-400 block mt-1">منشآت عقارية يمنية مرخصة</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 text-xs block mb-1">قضايا وبلاغات النزاعات</span>
            <span className="text-3xl font-black text-rose-600">{reports.length}</span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {reports.filter(r => r.status === 'new').length} بلاغات قيد التحقيق الأولي
            </span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 text-xs block mb-1">سجل التدقيق الإداري</span>
            <span className="text-3xl font-black text-blue-600">{auditLogs.length}</span>
            <span className="text-[11px] text-slate-400 block mt-1">عمليات إدارية مسجلة بالتاريخ</span>
          </div>
        </div>
      )}

      {/* Tab 4: Security Policies */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs leading-relaxed text-slate-700">
          <h3 className="font-bold text-base text-[#16324F]">سياسات حماية البيانات والأمن الصارم (Security Rules):</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>عزل الإعلانات غير المنشورة:</strong> يمنع الخادم تسريب المسودات أو الإعلانات المعلقة في أي استعلام عام للزوار.</li>
            <li><strong>خصوصية المبلّغين:</strong> حجب تام لبيانات المتصلين والمبلغين عن المعلن لمنع النزاعات الشخصية.</li>
            <li><strong>أمن الوثائق الخاصة:</strong> حفظ وثائق البصائر وعقود الملكية في خزانة مشفرة تفتح لمسؤول التحقق فقط.</li>
            <li><strong>منع الترويج الوهمي:</strong> لا توجد أي خدمات دفع مالي أو اشتراكات بدون بوابات دفع يمنية مرخصة.</li>
          </ul>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 font-mono text-[11px]">System Status: SECURE • Version 2026.1-YE</span>
            <button
              onClick={resetToInitialData}
              className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold transition-colors"
            >
              استعادة ضبط المصنع للبيانات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
