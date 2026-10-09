import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Play, Ban, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface CalendarDayModel {
  date: string;
  isHoliday: boolean;
  holidayName?: string;
}

interface AttendanceSession {
  _id: string;
  attendanceDate: string;
  status: string;
  isExcluded: boolean;
  startTime: string;
  endTime: string;
}

export const MonthlyCalendar: React.FC<{ onStartSessionClick: (date: string) => void }> = ({ onStartSessionClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<CalendarDayModel[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');

  useEffect(() => {
    fetchCalendarData();
  }, [year, month]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/calendar/${year}/${month}`);
      setDays(res.data.days || []);
      setSessions(res.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch calendar', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));

  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
  const startDayOfWeek = new Date(year, currentDate.getMonth(), 1).getDay();

  const getDayData = (dateStr: string) => {
    return days.find(d => d.date === dateStr);
  };

  const getSessionData = (dateStr: string) => {
    return sessions.find(s => s.attendanceDate === dateStr);
  };

  const toggleHoliday = async (dateStr: string, currentHolidayStatus: boolean) => {
    try {
      if (!currentHolidayStatus) {
        if (!window.confirm(`Mark ${dateStr} as a Holiday?`)) return;
      }
      await api.put(`/calendar/${dateStr}/holiday`, { isHoliday: !currentHolidayStatus });
      fetchCalendarData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error updating holiday status');
    }
  };

  const toggleExclusion = async (sessionId: string, currentExcludedStatus: boolean) => {
    try {
      const action = currentExcludedStatus ? 'RESTORE' : 'EXCLUDE';
      if (!window.confirm(`Are you sure you want to ${action} this session from official statistics?`)) return;

      await api.put(`/calendar/session/${sessionId}/exclude`, { isExcluded: !currentExcludedStatus, exclusionReason: 'Admin action' });
      fetchCalendarData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error updating exclusion status');
    }
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 border border-gray-100 bg-gray-50/50"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
      const dayData = getDayData(dateStr);
      const sessionData = getSessionData(dateStr);

      const isHoliday = dayData?.isHoliday;
      const isExcluded = sessionData?.isExcluded;

      let cellClass = "h-24 border border-gray-200 p-2 relative flex flex-col transition-colors cursor-pointer hover:bg-gray-50 ";
      if (isHoliday) cellClass += "bg-red-50/70 border-red-100";
      else if (sessionData) {
        if (isExcluded) cellClass += "bg-gray-100 border-gray-300 opacity-80";
        else if (sessionData.status === 'ACTIVE') cellClass += "bg-[#EEF9F2] border-[#DDF5E8]";
        else cellClass += "bg-white";
      } else cellClass += "bg-white";

      cells.push(
        <div key={dateStr} className={cellClass} onClick={() => setSelectedDate(dateStr)}>
          <span className="text-sm font-medium text-gray-700">{i}</span>

          <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
            {isHoliday && <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded w-fit">Holiday</span>}
            {sessionData && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit ${
                isExcluded ? 'bg-gray-200 text-gray-600' :
                sessionData.status === 'ACTIVE' ? 'bg-[#0B8F55] text-white' :
                'bg-[#DDF5E8] text-[#0B8F55]'
              }`}>
                {isExcluded ? 'EXCLUDED' : sessionData.status}
              </span>
            )}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F7FBF8]">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#0B8F55]" />
          <h2 className="text-lg font-semibold text-[#10231A]">Academic Calendar</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded transition"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-medium min-w-[120px] text-center">{new Date(year, parseInt(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded transition"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 relative">
        {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">Loading...</div>}
        {renderCells()}
      </div>

      {selectedDate && (
        <DateModal
          date={selectedDate}
          dayData={getDayData(selectedDate)}
          sessionData={getSessionData(selectedDate)}
          onClose={() => setSelectedDate(null)}
          onToggleHoliday={() => toggleHoliday(selectedDate, !!getDayData(selectedDate)?.isHoliday)}
          onToggleExclusion={(id, curr) => toggleExclusion(id, curr)}
          onStartSession={() => {
            setSelectedDate(null);
            onStartSessionClick(selectedDate);
          }}
        />
      )}
    </div>
  );
};

const DateModal: React.FC<{
  date: string, dayData?: CalendarDayModel, sessionData?: AttendanceSession,
  onClose: () => void, onToggleHoliday: () => void, onToggleExclusion: (id: string, curr: boolean) => void, onStartSession: () => void
}> = ({ date, dayData, sessionData, onClose, onToggleHoliday, onToggleExclusion, onStartSession }) => {
  const isHoliday = dayData?.isHoliday;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F7FBF8]">
          <h3 className="font-semibold text-lg text-[#10231A]">{date}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Day Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${isHoliday ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {isHoliday ? 'HOLIDAY' : 'WORKING DAY'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Official Session:</span>
            {sessionData ? (
              <span className={`px-2 py-1 rounded text-xs font-bold ${sessionData.isExcluded ? 'bg-gray-200 text-gray-700' : 'bg-[#DDF5E8] text-[#0B8F55]'}`}>
                {sessionData.isExcluded ? 'EXCLUDED FROM STATS' : sessionData.status}
              </span>
            ) : (
              <span className="text-sm text-gray-400">None</span>
            )}
          </div>

          <hr className="border-gray-100" />

          <div className="flex flex-col gap-2">
            {!sessionData && (
              <button onClick={onToggleHoliday} className={`w-full py-2 rounded font-medium text-sm transition ${isHoliday ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}>
                {isHoliday ? 'Change to Working Day' : 'Mark as Holiday'}
              </button>
            )}

            {sessionData && (
              <button onClick={() => onToggleExclusion(sessionData._id, sessionData.isExcluded)} className={`w-full py-2 rounded flex items-center justify-center gap-2 font-medium text-sm transition ${sessionData.isExcluded ? 'bg-[#0B8F55] hover:bg-[#097546] text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-600'}`}>
                {sessionData.isExcluded ? <><CheckCircle className="w-4 h-4"/> Restore to Official Stats</> : <><Ban className="w-4 h-4"/> Exclude from Official Stats</>}
              </button>
            )}

            {!isHoliday && !sessionData && (
              <button onClick={onStartSession} className="w-full py-2 rounded flex items-center justify-center gap-2 font-medium text-sm bg-[#0B8F55] hover:bg-[#097546] text-white transition">
                <Play className="w-4 h-4"/> Start Attendance Session
              </button>
            )}

            {isHoliday && sessionData && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Conflict: This date is marked as a holiday but has an attendance session. Please exclude or remove the session, or unmark the holiday.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
