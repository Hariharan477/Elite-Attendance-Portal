import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LayoutDashboard, Users, Calendar, FileText, Wifi, Settings, Plus,
  Trash2, Search, Download, Upload, Play, StopCircle, CheckCircle, XCircle, Clock, ShieldCheck
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'students' | 'daily' | 'reports' | 'wifi' | 'settings'>('dashboard');

  // Data states
  const [students, setStudents] = useState<any[]>([]);
  const [wifiAPs, setWifiAPs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [todayOverview, setTodayOverview] = useState<any>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportMonth, setReportMonth] = useState('');

  // Daily Attendance Config Form (Date, Start Time, End Time, Wi-Fi AP)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:10');
  const [selectedWifiAp, setSelectedWifiAp] = useState('');

  // Live timer state
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const fetchSectionData = async () => {
    try {
      if (activeSection === 'students' || activeSection === 'dashboard') {
        const res = await api.get(`/students?search=${search}&department=${deptFilter}`);
        setStudents(res.data);
      }
      if (activeSection === 'wifi' || activeSection === 'dashboard' || activeSection === 'daily') {
        const res = await api.get('/wifi');
        setWifiAPs(res.data);
      }
      if (activeSection === 'daily' || activeSection === 'dashboard') {
        const res = await api.get(`/attendance/today-overview?date=${attendanceDate}`);
        setTodayOverview(res.data);

        if (res.data.settings && res.data.settings.status === 'ACTIVE') {
          const end = new Date(res.data.settings.endTime).getTime();
          const now = new Date().getTime();
          const diff = Math.max(0, Math.floor((end - now) / 1000));
          setTimeLeft(diff);
        } else {
          setTimeLeft(0);
        }
      }
      if (activeSection === 'reports') {
        const res = await api.get(`/attendance/report?department=${deptFilter}&date=${reportDate}&month=${reportMonth}`);
        setReports(res.data.records || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSectionData();
  }, [activeSection, search, deptFilter, reportDate, reportMonth, attendanceDate]);

  // Live poll for daily attendance
  useEffect(() => {
    let timer: any;
    if (activeSection === 'daily' || activeSection === 'dashboard') {
      timer = setInterval(() => {
        api.get(`/attendance/today-overview?date=${attendanceDate}`).then((res) => {
          setTodayOverview(res.data);
          if (res.data.settings && res.data.settings.status === 'ACTIVE') {
            const end = new Date(res.data.settings.endTime).getTime();
            const now = new Date().getTime();
            setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
          } else {
            setTimeLeft(0);
          }
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [activeSection, attendanceDate]);

  // Timer countdown local tick
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleStartDailyAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance/start', {
        attendanceDate,
        startTime,
        endTime,
        wifiAccessPointId: selectedWifiAp || undefined
      });
      alert('Daily attendance started successfully with Wi-Fi Location!');
      fetchSectionData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start daily attendance');
    }
  };


  const handleEndDailyAttendance = async () => {
    if (!window.confirm('Are you sure you want to close today\'s attendance early?')) return;
    try {
      await api.post('/attendance/end', { attendanceDate });
      fetchSectionData();
    } catch (err) {
      alert('Failed to end attendance');
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === 'student') await api.delete(`/students/${id}`);
      if (type === 'wifi') await api.delete(`/wifi/${id}`);
      fetchSectionData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeSection === 'students') {
        const res = await api.post('/students', formData);
        alert(`Student '${res.data.name}' added successfully!`);
      } else if (activeSection === 'wifi') {
        await api.post('/wifi', formData);
        alert('Wi-Fi Access Point added successfully!');
      }

      setShowModal(false);
      setFormData({});
      fetchSectionData();
    } catch (err: any) {
      console.error('[handleCreateSubmit Error]', err);
      const serverMsg = err.response?.data?.message || err.message || 'Failed to create record';
      alert(`Error: ${serverMsg}`);
    }
  };


  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return alert('Select an Excel file first');
    const data = new FormData();
    data.append('file', excelFile);
    try {
      const res = await api.post('/students/import-excel', data);
      alert(res.data.message);
      setExcelFile(null);
      fetchSectionData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Excel Import Failed');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    window.open(`/api/attendance/report?format=${format}&department=${deptFilter}&date=${reportDate}&month=${reportMonth}`, '_blank');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'daily', label: 'Daily Attendance', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'wifi', label: 'Wi-Fi Settings', icon: Wifi },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];


  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
      
      {/* Sidebar Navigation */}
      <aside className="glass-card" style={{ width: '260px', borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          ADMIN MENU
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={isActive ? 'glass-button' : 'glass-button-outline'}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '0.85rem 1rem',
                fontSize: '0.9rem',
                borderRadius: '12px'
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Content Body */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, textTransform: 'capitalize' }}>
              {activeSection === 'daily' ? 'Daily Attendance' : activeSection.replace('-', ' ')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Elite Class Portal Administrative Panel
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {(activeSection === 'students' || activeSection === 'wifi') && (
              <button className="glass-button" onClick={() => setShowModal(true)} style={{ fontSize: '0.85rem' }}>
                <Plus size={16} /> Add {activeSection.slice(0, -1)}
              </button>
            )}
            {activeSection === 'reports' && (
              <>
                <button className="glass-button-outline" onClick={() => handleExport('excel')} style={{ fontSize: '0.85rem' }}>
                  <Download size={16} color="#34d399" /> Download Excel
                </button>
                <button className="glass-button-outline" onClick={() => handleExport('pdf')} style={{ fontSize: '0.85rem' }}>
                  <Download size={16} color="#f87171" /> Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1. Dashboard Overview */}
        {activeSection === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  <Users size={32} />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Students</p>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{students.length || 110}</h2>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <CheckCircle size={32} />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Present Today</p>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{todayOverview?.stats?.presentCount || 0}</h2>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#f87171' }}>
                  <XCircle size={32} />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Absent Today</p>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171' }}>{todayOverview?.stats?.absentCount || 0}</h2>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <Clock size={32} />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Remaining Time</p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: timeLeft < 60 ? '#f87171' : '#34d399' }}>
                    {formatTime(timeLeft)}
                  </h2>
                </div>
              </div>
            </div>

            {/* Today's Live Banner */}
            {todayOverview?.settings?.status === 'ACTIVE' ? (
              <div className="glass-card pulse-active" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-active">TODAY'S ATTENDANCE ACTIVE</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#818cf8' }}>
                      Date: {todayOverview.settings.attendanceDate}
                    </h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Window: {new Date(todayOverview.settings.startTime).toLocaleTimeString()} - {new Date(todayOverview.settings.endTime).toLocaleTimeString()}
                      {todayOverview.settings.wifiLocation && (
                        <span> • Location: <strong style={{ color: '#fbbf24' }}>{todayOverview.settings.wifiLocation}</strong></span>
                      )}
                    </p>

                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>
                      {todayOverview.stats.presentCount} / {todayOverview.stats.total}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Students Present ({todayOverview.stats.percentage}%)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Calendar size={48} color="#64748b" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3>No Active Attendance Today</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Go to "Daily Attendance" in the sidebar to configure and open today's attendance window.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. Students Management */}
        {activeSection === 'students' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            
            {/* Excel Upload Row */}
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Upload size={18} /> Bulk Import Students from Excel (.xlsx)
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Upload Excel spreadsheet containing Columns: Name, Register Number, Department, Year, Section, Email.
                </p>
              </div>

              <form onSubmit={handleExcelImport} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
                  className="glass-input"
                  style={{ width: '220px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                />
                <button type="submit" className="glass-button" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  Import Excel
                </button>
              </form>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search students by name, reg no, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="glass-input" style={{ width: '180px' }}>
                <option value="">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
              </select>
            </div>

            {/* Students Table */}
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Google Email Account</th>
                  <th>Dept</th>
                  <th>Year / Sec</th>
                  <th>Device Reset</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 700, color: '#818cf8' }}>{s.registerNo || s.rollNo}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: '#34d399' }}>{s.email}</td>
                    <td><span className="badge badge-role">{s.department}</span></td>
                    <td>Year {s.year} - {s.section}</td>
                    <td>
                      <button
                        className="glass-button-outline"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to reset the registered device for ${s.name} (${s.email})?\nThis will allow the student to bind a new mobile device during their next login.`)) {
                            try {
                              const res = await api.post(`/students/${s._id}/reset-device`);
                              alert(res.data.message || 'Device reset successfully.');
                              fetchSectionData();
                            } catch (err: any) {
                              alert(err.response?.data?.message || 'Failed to reset device');
                            }
                          }
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                      >
                        Reset Device
                      </button>
                    </td>
                    <td>
                      <button onClick={() => handleDelete(s._id, 'student')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>


          </div>
        )}

        {/* 3. Daily Attendance Configuration & Today's Realtime Overview */}
        {activeSection === 'daily' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Form */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar color="#818cf8" /> Configure Today's Attendance
              </h3>

              <form onSubmit={handleStartDailyAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Authorized Wi-Fi Location / Access Point *
                  </label>
                  <select
                    value={selectedWifiAp}
                    onChange={(e) => setSelectedWifiAp(e.target.value)}
                    className="glass-input"
                    required
                  >
                    <option value="">-- Select Authorized Wi-Fi Access Point --</option>
                    {wifiAPs.filter(ap => ap.isActive !== false).map((ap) => (
                      <option key={ap._id} value={ap._id}>
                        {ap.location} ({ap.ssid} - {ap.bssid})
                      </option>
                    ))}
                  </select>
                </div>



                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="glass-button" style={{ flex: 1 }}>
                    <Play size={18} /> Start Attendance
                  </button>

                  {todayOverview?.settings?.status === 'ACTIVE' && (
                    <button type="button" onClick={handleEndDailyAttendance} className="glass-button-outline" style={{ color: '#f87171', borderColor: 'rgba(244,63,94,0.4)' }}>
                      <StopCircle size={18} /> Close Attendance
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Today's Roster Monitor */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#818cf8' }}>
                  Today's Attendance Overview
                </h3>
                {todayOverview?.settings?.status === 'ACTIVE' ? (
                  <span className="badge badge-active pulse-active">ACTIVE</span>
                ) : (
                  <span className="badge badge-expired">CLOSED</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>PRESENT</p>
                  <h3 style={{ fontSize: '1.5rem', color: '#34d399', fontWeight: 800 }}>{todayOverview?.stats?.presentCount || 0}</h3>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>ABSENT</p>
                  <h3 style={{ fontSize: '1.5rem', color: '#f87171', fontWeight: 800 }}>{todayOverview?.stats?.absentCount || 0}</h3>
                </div>
                <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700 }}>REMAINING</p>
                  <h3 style={{ fontSize: '1.2rem', color: timeLeft < 60 ? '#f87171' : '#818cf8', fontWeight: 800 }}>{formatTime(timeLeft)}</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ color: '#34d399', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle size={14} /> Present ({todayOverview?.presentStudents?.length || 0})
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {todayOverview?.presentStudents?.map((p: any) => (
                      <div key={p._id} style={{ fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {p.name} ({p.registerNo || p.rollNo})
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <XCircle size={14} /> Absent ({todayOverview?.absentStudents?.length || 0})
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {todayOverview?.absentStudents?.map((a: any) => (
                      <div key={a._id} style={{ fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        {a.name} ({a.registerNo || a.rollNo})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 4. Reports & Analytics */}
        {activeSection === 'reports' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Department</label>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="glass-input">
                  <option value="">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Daily Date Filter</label>
                <input type="date" value={reportDate} onChange={(e) => { setReportDate(e.target.value); setReportMonth(''); }} className="glass-input" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Monthly Filter (YYYY-MM)</label>
                <input type="month" value={reportMonth} onChange={(e) => { setReportMonth(e.target.value); setReportDate(''); }} className="glass-input" />
              </div>
            </div>

            <table className="glass-table">
              <thead>
                <tr>
                  <th>Register No</th>
                  <th>Student Name</th>
                  <th>Google Email</th>
                  <th>Attendance Date</th>
                  <th>Check-In Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 700 }}>{r.studentId?.registerNo || r.studentId?.rollNo || 'N/A'}</td>
                    <td>{r.studentId?.name || 'N/A'}</td>
                    <td>{r.studentId?.email || 'N/A'}</td>
                    <td>{r.attendanceDate}</td>
                    <td style={{ color: '#34d399' }}>{new Date(r.checkInTime).toLocaleTimeString()}</td>
                    <td><span className="badge badge-active">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Wi-Fi Access Points */}
        {activeSection === 'wifi' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>SSID</th>
                  <th>BSSID / MAC</th>
                  <th>Campus Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wifiAPs.map((w) => (
                  <tr key={w._id}>
                    <td style={{ fontWeight: 700, color: '#fbbf24' }}>{w.ssid}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{w.bssid}</td>
                    <td>{w.location}</td>
                    <td><span className="badge badge-active">ACTIVE</span></td>
                    <td>
                      <button onClick={() => handleDelete(w._id, 'wifi')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Settings */}
        {activeSection === 'settings' && (
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck color="#818cf8" /> Google OAuth 2.0 Authentication Settings
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              System is secured by Google OAuth 2.0. Any user whose Google email address has been added by the Administrator can log in directly using Google Sign-In.
            </p>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.85rem' }}>
              ✓ Google OAuth 2.0 Guard: ACTIVE (Registered Admin Emails Allowed)
            </div>
          </div>
        )}

      </main>

      {/* Dynamic Creation Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', textTransform: 'capitalize' }}>Add New {activeSection.slice(0, -1)}</h3>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeSection === 'students' && (
                <>
                  <input placeholder="Student Full Name" value={formData.name || ''} className="glass-input" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <input placeholder="Google Email Account (e.g. name@gmail.com)" value={formData.email || ''} type="email" className="glass-input" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  <input placeholder="Register Number (e.g. 710022104001)" value={formData.registerNo || ''} className="glass-input" required onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })} />
                  <input placeholder="Roll Number (e.g. 22CS001)" value={formData.rollNo || ''} className="glass-input" onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} />
                  <select className="glass-input" value={formData.department || ''} required onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                    <option value="">Select Department</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <input placeholder="Year (1-4)" value={formData.year || ''} className="glass-input" required onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                    <input placeholder="Section (A/B/C)" value={formData.section || ''} className="glass-input" required onChange={(e) => setFormData({ ...formData, section: e.target.value })} />
                  </div>
                </>
              )}


              {activeSection === 'wifi' && (
                <>
                  <input placeholder="Wi-Fi SSID" className="glass-input" required onChange={(e) => setFormData({ ...formData, ssid: e.target.value })} />
                  <input placeholder="Wi-Fi BSSID / MAC (e.g. a1:b2:c3:d4:e5:f6)" className="glass-input" required onChange={(e) => setFormData({ ...formData, bssid: e.target.value })} />
                  <input placeholder="Location" className="glass-input" required onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="glass-button" style={{ flex: 1 }}>Save</button>
                <button type="button" className="glass-button-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
