import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiRequest, getStoredSession } from '../lib/api';
import RichTextEditor from '../components/common/RichTextEditor';
import SlaBadge from '../components/tickets/SlaBadge';
import TicketList from '../components/tickets/TicketList';
import CategorySelector from '../components/tickets/CategorySelector';

const initialForm = {
  title: '',
  description: '',
  priority: '',
  customerId: '',
  ticketType: 'Incidencia',
  category: '',
  locationId: '',
  assetId: '',
  status: 'NEW',
  assignedToId: '',
  secondaryAssignedToId: '',
  responsibleUserIds: [],
  observerId: '',
  sla: ''
};

/**
 * Utilidad para eliminar etiquetas HTML de una cadena de texto.
 */
function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// Las utilidades stripHtml y RichTextEditor ahora se importan desde sus respectivos componentes modulares.

/**
 * Obtiene la clase CSS (color) correspondiente a cada nivel de prioridad.
 * Maps ticket priority to a specific CSS badge class for styling.
 */
function getPriorityClass(priority) {
  if (priority === 'CRITICAL' || priority === 'EMERGENCY') return 'badge-danger';
  if (priority === 'WARNING') return 'badge-warning';
  return 'badge-neutral';
}

/**
 * Retorna el nombre legible (en español) para el nivel de prioridad.
 * Returns the human-readable label for the ticket priority level.
 */
function getPriorityLabel(priority) {
  const labels = { EMERGENCY: 'Emergencia', CRITICAL: 'Crítico', WARNING: 'Advertencia', NORMAL: 'Normal' };
  return labels[priority] || priority;
}

/**
 * Obtiene la clase CSS (color) correspondiente al estado actual del ticket.
 * Maps ticket status to a specific CSS badge class for styling.
 */
function getStatusClass(status) {
  if (status === 'NEW') return 'badge-warning';
  if (status === 'OPEN') return 'badge-info';
  if (status === 'IN_PROGRESS') return 'badge-info';
  if (status === 'SCHEDULED') return 'badge-warning-alt';
  if (status === 'RESOLVED') return 'badge-success';
  if (status === 'CLOSED') return 'badge-closed';
  return 'badge-neutral';
}

/**
 * Retorna el nombre legible (en español) para el estado del ticket.
 * Returns the human-readable label for the ticket status.
 */
function getStatusLabel(status) {
  const labels = { 
    NEW: 'Nuevo', 
    OPEN: 'En Progreso', 
    IN_PROGRESS: 'En Progreso', 
    SCHEDULED: 'Programado',
    RESOLVED: 'Resuelto', 
    CLOSED: 'Cerrado' 
  };
  return labels[status] || status;
}

function getInitials(name) {
  return String(name || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'US';
}

function getAssignableRoleLabel(user) {
  const roleName = getUserRoleName(user);
  const labels = {
    ADMIN: 'Administrador',
    ADMINISTRADOR: 'Administrador',
    LEVEL_1: 'Tecnico Nivel 1',
    LEVEL_2: 'Tecnico Nivel 2',
    LEVEL_3: 'Tecnico Nivel 3',
    'NIVEL 1': 'Tecnico Nivel 1',
    'NIVEL 2': 'Tecnico Nivel 2',
    'NIVEL 3': 'Tecnico Nivel 3',
    TECNICO: 'Tecnico',
    'TECNICO NIVEL 1': 'Tecnico Nivel 1',
    'TECNICO NIVEL 2': 'Tecnico Nivel 2',
    'TECNICO NIVEL 3': 'Tecnico Nivel 3',
  };
  return labels[roleName] || roleName || 'Sin rol';
}

function AvatarThumb({ name, avatarUrl, borderColor = '#d0d7de' }) {
  return (
    <div style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden', border: `2px solid ${borderColor}`, background: '#eef3f8' }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={`Avatar de ${name || 'usuario'}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#0f9d3a', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function getUserRoleName(user) {
  if (!user) {
    return '';
  }
  const roleValue = typeof user.role === 'string' ? user.role : user.role?.name || '';
  return roleValue.trim().toUpperCase();
}

function isAssignableUser(user) {
  const roleName = getUserRoleName(user);
  return [
    'ADMIN', 'ADMINISTRADOR', 
    'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 
    'NIVEL 1', 'NIVEL 2', 'NIVEL 3',
    'TECNICO', 'TECNICO NIVEL 1', 'TECNICO NIVEL 2', 'TECNICO NIVEL 3'
  ].includes(roleName);
}

function isStandardUser(user) {
  return getUserRoleName(user) === 'USUARIO ESTANDAR';
}

function getResponsibleUserIds(ticket) {
  if (Array.isArray(ticket?.responsibleUserIds) && ticket.responsibleUserIds.length > 0) {
    return ticket.responsibleUserIds.map(String);
  }

  return [...new Set([ticket?.assignedToId, ticket?.secondaryAssignedToId].filter(Boolean).map(String))];
}

function ResponsibleSelector({ users, selectedIds, onChange, onViewProfile }) {
  const [search, setSearch] = useState('');
  const selectedIdSet = new Set(selectedIds.map(String));
  const selectedUsers = selectedIds
    .map((id) => users.find((user) => String(user.id) === String(id)))
    .filter(Boolean);
  const filteredUsers = users.filter((user) => {
    if (selectedIdSet.has(String(user.id))) return false;
    if (!search.trim()) return false;
    const roleLabel = getAssignableRoleLabel(user);
    return `${user.name} ${roleLabel}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  function addUser(userId) {
    if (selectedIds.length >= 5) return;
    onChange([...selectedIds, String(userId)]);
    setSearch('');
  }

  function removeUser(userId) {
    onChange(selectedIds.filter((id) => String(id) !== String(userId)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {selectedUsers.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {selectedUsers.map((user) => (
          <span key={user.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#e8f5e9', color: '#14532d', border: '1px solid #a5d6a7', borderRadius: '999px', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => onViewProfile && onViewProfile(user)}>{user.name}</span>
            <button type="button" onClick={() => removeUser(user.id)} style={{ border: 'none', background: 'transparent', color: '#14532d', cursor: 'pointer', fontWeight: 700, padding: 0, lineHeight: 1 }}>
              ×
            </button>
          </span>
          ))}
        </div>
      ) : null}

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={selectedIds.length >= 5 ? 'Maximo 5 responsables asignados' : 'Buscar tecnico por nombre o rol...'}
        disabled={selectedIds.length >= 5}
        style={{ background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem' }}
      />

      {search.trim() ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', maxHeight: '180px', overflowY: 'auto' }}>
          {filteredUsers.length > 0 ? filteredUsers.slice(0, 12).map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => addUser(user.id)}
            disabled={selectedIds.length >= 5}
            style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', padding: '0.65rem 0.8rem', cursor: 'pointer' }}
          >
            <strong style={{ display: 'block', color: '#1e293b' }}>{user.name}</strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getAssignableRoleLabel(user)}</span>
          </button>
          )) : (
            <div style={{ padding: '0.75rem 0.8rem', fontSize: '0.8rem', color: '#64748b' }}>
              {selectedIds.length >= 5 ? 'Ya alcanzaste el limite de 5 responsables.' : 'No se encontraron tecnicos con ese filtro.'}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchableSingleUserSelector({ users, value, onChange, placeholder }) {
  const [search, setSearch] = useState('');
  const selectedUser = users.find((user) => String(user.id) === String(value));
  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return false;
    const roleLabel = getAssignableRoleLabel(user);
    return `${user.name} ${roleLabel}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  function selectUser(user) {
    onChange(String(user.id));
    setSearch('');
  }

  function clearSelection() {
    onChange('');
    setSearch('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem' }}
        />
        {selectedUser ? (
          <button type="button" onClick={clearSelection} style={{ border: '1px solid #ced4da', background: '#fff', borderRadius: '4px', padding: '0.45rem 0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
            Limpiar
          </button>
        ) : null}
      </div>

      {selectedUser ? (
        <div style={{ padding: '0.45rem 0.6rem', background: '#f0f2f5', borderRadius: '4px', color: '#333', border: '1px solid #e0e0e0' }}>
          {selectedUser.name}
        </div>
      ) : (
        <div style={{ minHeight: '38px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px' }} />
      )}

      {search.trim() ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', maxHeight: '180px', overflowY: 'auto' }}>
          {filteredUsers.length > 0 ? filteredUsers.slice(0, 12).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', padding: '0.65rem 0.8rem', cursor: 'pointer' }}
            >
              <strong style={{ display: 'block', color: '#1e293b' }}>{user.name}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getAssignableRoleLabel(user)}</span>
            </button>
          )) : (
            <div style={{ padding: '0.75rem 0.8rem', fontSize: '0.8rem', color: '#64748b' }}>
              No se encontraron usuarios con ese filtro.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Horario hábil: Lun-Vie, 8:00-12:00 y 14:00-17:30
// Business hours: Mon-Fri, 08:00-12:00 and 14:00-17:30

/**
 * Función principal para calcular el Acuerdo de Nivel de Servicio (ANS / SLA).
 * Core function to calculate the Service Level Agreement (ANS / SLA).
 * Evalúa el progreso y la fecha límite tomando en cuenta horas hábiles / Evaluates progress based on business hours.
 *
 * @param {Date|string} createdAt - Fecha de creación del ticket / Creation timestamp
 * @param {string} slaInput - SLA como texto, ej "4h" / SLA limit as string, e.g. "4h"
 * @param {Date|string|null} resolutionTime - (Opcional) Tiempo cuando se resolvió el ticket / (Optional) Time when ticket was resolved
 */
function getSlaInfo(createdAt, slaInput, resolutionTime = null, status = null) {
  let baseTime = createdAt;
  let finalSla = slaInput;

  let isScheduled = false;
  if (slaInput && slaInput.startsWith('SCHEDULED:')) {
    baseTime = slaInput.replace('SCHEDULED:', '');
    finalSla = '2h'; // Expand SLA exactly 2 hours from scheduled time
    isScheduled = true;
  } else if (status === 'SCHEDULED') {
    // If ticket is Scheduled but missing the explicit schedule date in SLA, we fallback to pause
    return {
      deadlineLabel: 'Visita Programada',
      percentage: 100,
      color: '#ff9800',
      isOverdue: false,
      remainingStr: 'SLA Pausado'
    };
  }

  if (!finalSla || finalSla.startsWith('Sin')) return { label: 'Sin límite', percentage: 100, color: '#e0e0e0', isOverdue: false, remainingStr: '—' };
  
  const totalHours = parseInt(finalSla.replace('h', ''));
  if (isNaN(totalHours)) return { label: 'Sin límite', percentage: 100, color: '#e0e0e0', isOverdue: false, remainingStr: '—' };

  let remainingMinutes = totalHours * 60;
  const now = resolutionTime ? new Date(resolutionTime) : new Date();

  // Bloques hábiles del día (en minutos desde medianoche)
  const blocks = [
    { start: 8 * 60, end: 12 * 60 },       // 8:00 - 12:00 (240 min)
    { start: 14 * 60, end: 17 * 60 + 30 },  // 14:00 - 17:30 (210 min)
  ];

  function isWeekday(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5; 
  }

  function getMinuteOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function advanceToNextBlock(date) {
    let d = new Date(date);
    while (!isWeekday(d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
    }
    const minuteOfDay = getMinuteOfDay(d);
    if (minuteOfDay < blocks[0].start) {
      d.setHours(8, 0, 0, 0);
      return d;
    }
    if (minuteOfDay >= blocks[0].end && minuteOfDay < blocks[1].start) {
      d.setHours(14, 0, 0, 0);
      return d;
    }
    if (minuteOfDay >= blocks[1].end) {
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      while (!isWeekday(d)) d.setDate(d.getDate() + 1);
      return d;
    }
    return d;
  }

  // Find Deadline
  let deadlineCursor = advanceToNextBlock(new Date(baseTime));
  let tempMinutes = remainingMinutes;
  let safety = 0;
  while (tempMinutes > 0 && safety < 500) {
    safety++;
    const minuteOfDay = getMinuteOfDay(deadlineCursor);
    let currentBlock = blocks.find(b => minuteOfDay >= b.start && minuteOfDay < b.end);
    if (!currentBlock) {
      deadlineCursor = advanceToNextBlock(deadlineCursor);
      continue;
    }
    const minutesLeftInBlock = currentBlock.end - minuteOfDay;
    if (tempMinutes <= minutesLeftInBlock) {
      deadlineCursor.setMinutes(deadlineCursor.getMinutes() + tempMinutes);
      tempMinutes = 0;
    } else {
      tempMinutes -= minutesLeftInBlock;
      deadlineCursor.setHours(Math.floor(currentBlock.end / 60), currentBlock.end % 60, 0, 0);
      deadlineCursor = advanceToNextBlock(deadlineCursor);
    }
  }

  function getBusinessMinutes(start, end) {
    if (start > end) return 0;
    let cursor = advanceToNextBlock(new Date(start));
    let mins = 0;
    let safe = 0;
    while (cursor < end && safe < 1000) {
      safe++;
      const minOfDay = getMinuteOfDay(cursor);
      let block = blocks.find(b => minOfDay >= b.start && minOfDay < b.end);
      if (!block) {
        let nDate = advanceToNextBlock(cursor);
        if (nDate > end) break;
        cursor = nDate;
        continue;
      }
      const minsLeft = block.end - minOfDay;
      const minsDist = Math.floor((end - cursor) / 60000);
      if (minsDist <= minsLeft) {
        mins += minsDist;
        break;
      } else {
        mins += minsLeft;
        cursor.setHours(Math.floor(block.end / 60), block.end % 60, 0, 0);
        cursor = advanceToNextBlock(cursor);
      }
    }
    return mins;
  }

  const isOverdue = now > deadlineCursor;
  let minutesLeft = 0;
  let percentage = 0;

  if (isOverdue) {
    minutesLeft = 0;
    percentage = 0;
  } else {
    minutesLeft = getBusinessMinutes(now, deadlineCursor);
    let totalAllowed = remainingMinutes;
    if (isScheduled) {
      totalAllowed = getBusinessMinutes(new Date(createdAt), deadlineCursor);
    }
    percentage = Math.max(0, Math.min(100, (minutesLeft / (totalAllowed || 1)) * 100));
  }

  // Color interpolation: Green (120deg) to Red (0deg)
  const hue = (percentage * 1.2).toFixed(0); // 100% -> 120 (green), 0% -> 0 (red)
  const color = `hsl(${hue}, 80%, 45%)`;

  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  const remainingStr = isOverdue ? 'Vencido' : `${h}h ${m}m restantes`;

  return {
    deadlineLabel: deadlineCursor.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    percentage,
    color: isOverdue ? '#d32f2f' : color,
    isOverdue,
    remainingStr
  };
}

/**
 * Componente visual que renderiza la barra de progreso del tiempo restante (ANS).
 * Visual component rendering the remaining time (SLA) progress bar.
 */
function SlaProgressBar({ createdAt, sla, resolvedAt, status }) {
  const [info, setInfo] = React.useState(getSlaInfo(createdAt, sla, resolvedAt, status));

  React.useEffect(() => {
    if (resolvedAt) return;
    const timer = setInterval(() => setInfo(getSlaInfo(createdAt, sla, resolvedAt, status)), 60000); // update every minute
    return () => clearInterval(timer);
  }, [createdAt, sla, resolvedAt, status]);

  if (!sla) return <span style={{ color: '#999', fontSize: '0.8rem' }}>Sin ANS</span>;

  return (
    <div style={{ width: '130px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ddd' }}>
        <div style={{ 
          width: `${info.percentage}%`, 
          height: '100%', 
          background: info.color, 
          transition: 'width 0.5s ease-in-out, background 0.5s' 
        }} />
      </div>
      <div style={{ fontSize: '0.72rem', color: info.isOverdue ? '#d32f2f' : '#333', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {info.remainingStr}
      </div>
    </div>
  );
}

/**
 * Obtiene el texto de la fecha límite según el ANS fijado.
 * Returns the deadline date string based on the given SLA.
 */
/**
 * Componente principal de la vista de Tickets.
 * Combina un listado tipo tabla interactivo con una interfaz gráfica completa (Detalle)
 * para editar la información de un ticket, ver reportes, estadísticas, SLA e histórico.
 * 
 * Main component for the Tickets view.
 * Combines an interactive table list with a full GUI (Details view) to edit
 * ticket info, reports, statistics, SLA, and audit history.
 */
export default function Tickets() {
  const [searchParams] = useSearchParams();
  const currentSession = getStoredSession();
  const currentUser = currentSession?.user || null;
  const canConfigureTicket = currentUser?.permissions?.includes('TICKETS_CONFIGURE');
  const canViewStats = currentUser?.permissions?.includes('TICKETS_VIEW_STATS');
  const [tickets, setTickets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [categoriesConfig, setCategoriesConfig] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.toUpperCase() || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category')?.toUpperCase() || 'ALL');
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [dashboardFilter, setDashboardFilter] = useState('ALL');
  const [assignedFilter, setAssignedFilter] = useState(searchParams.get('assigned') || 'ALL');
  const [showMobileForm, setShowMobileForm] = useState(false);
  
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority')?.toUpperCase() || 'ALL');
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [accParticipantes, setAccParticipantes] = useState(true);
  const [activeTab, setActiveTab] = useState('ticket');
  const [composeMode, setComposeMode] = useState(null); // 'comment' | 'schedule' | 'solution'
  const [composeText, setComposeText] = useState('');
  const [localComments, setLocalComments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [cannedResponses, setCannedResponses] = useState([]);
  const [cannedSearch, setCannedSearch] = useState('');
  const [showCannedList, setShowCannedList] = useState(false);
  const [saveCannedMode, setSaveCannedMode] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [activities, setActivities] = useState([]);
  const assignableUsers = users.filter(isAssignableUser);
  const participantCount = 1 + form.responsibleUserIds.length + (form.observerId ? 1 : 0);
  const hasExplicitAssignmentComment = activities.some(
    (activity) => activity?.action === 'COMMENTED' && activity?.newValue === 'Ticket asignado',
  );
  const visibleActivities = activities.filter((activity) => {
    if (!activity) return false;
    // Exclude raw "NEW" and "CLOSED" status messages as requested by user
    if (activity.field === 'Estado' && (activity.newValue === 'NEW' || activity.newValue === 'CLOSED')) return false;
    if (activity.action === 'CLOSED' && !activity.newValue) return false;

    // Show all comments, schedules, and specific status actions
    if (activity.action === 'COMMENTED' || activity.action === 'SCHEDULED') return true;
    if (activity.field === 'Estado') return true;
    if (['RESOLVED', 'CLOSED', 'IN_PROGRESS', 'POSTPONED', 'CANCELLED'].includes(activity.action)) return true;
    if (activity.action === 'UPDATED' && activity.field === 'Responsables') return true;
    return false;
  });

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          String(ticket.id),
          ticket.title,
          stripHtml(ticket.description),
          ticket.createdBy?.name,
          ticket.location?.name
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PROGRESS') {
          matchesStatus = ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN';
        } else {
          matchesStatus = ticket.status === statusFilter;
        }
      }
      const matchesLocation = locationFilter === 'ALL' || ticket.location?.name === locationFilter;
      const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;
      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;

      let matchesDate = true;
      if (startDateFilter || endDateFilter) {
        // Parse ticket date without time to compare properly
        const tDate = new Date(ticket.createdAt);
        tDate.setHours(0, 0, 0, 0);

        if (startDateFilter) {
          const sDate = new Date(`${startDateFilter}T00:00:00`);
          sDate.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && tDate >= sDate;
        }

        if (endDateFilter) {
          const eDate = new Date(`${endDateFilter}T23:59:59`);
          eDate.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && tDate <= eDate;
        }
      }

      let matchesDashboard = true;
      if (dashboardFilter === 'NEW') matchesDashboard = ticket.status === 'NEW';
      else if (dashboardFilter === 'IN_PROGRESS') matchesDashboard = ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN';
      else if (dashboardFilter === 'RESOLVED') matchesDashboard = ticket.status === 'RESOLVED';
      else if (dashboardFilter === 'UNRESOLVED') matchesDashboard = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
      else if (dashboardFilter === 'OVERDUE') matchesDashboard = getSlaInfo(ticket.createdAt, ticket.sla, ticket.resolvedAt || ticket.closedAt, ticket.status).isOverdue;

      let matchesAssigned = true;
      if (assignedFilter === 'me') {
        matchesAssigned = String(ticket.assignedToId) === String(currentUser?.id) || 
                          String(ticket.secondaryAssignedToId) === String(currentUser?.id) ||
                          (Array.isArray(ticket.responsibleUserIds) && ticket.responsibleUserIds.includes(String(currentUser?.id)));
      } else if (assignedFilter === 'none') {
        matchesAssigned = !ticket.assignedToId;
      }

      return matchesSearch && matchesStatus && matchesLocation && matchesCategory && matchesPriority && matchesDate && matchesDashboard && matchesAssigned;
    });
  }, [tickets, categoryFilter, locationFilter, priorityFilter, search, statusFilter, startDateFilter, endDateFilter, dashboardFilter, assignedFilter, currentUser?.id]);

  function findAvatarByUserName(name) {
    if (!name) {
      return null;
    }

    if (currentUser?.name === name) {
      return currentUser.avatarUrl || null;
    }

    return users.find((user) => user.name === name)?.avatarUrl || null;
  }

  // Auto-close effect: transition from RESOLVED to CLOSED after 8 hours of inactivity
  useEffect(() => {
    if (form.status === 'RESOLVED') {
      const waitTime = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const timer = setTimeout(() => {
        setForm(prev => ({ ...prev, status: 'CLOSED' }));
      }, waitTime); 
      return () => clearTimeout(timer);
    }
  }, [form.status]);

  const modeConfig = {
    comment:  { label: 'Comentario', color: '#607d8b', bg: '#f5f5f5', border: '#cfd8dc', align: 'left'  },
    schedule: { label: 'Programar',  color: '#e65100', bg: '#fff3e0', border: '#ffcc80', align: 'left'  },
    solution: { label: 'Solución',   color: '#0277bd', bg: '#e3f2fd', border: '#bbdefb', align: 'right' },
    accept:   { label: 'Aceptar',    color: '#2e7d32', bg: '#e8f5e9', border: '#a5d6a7', align: 'left'  },
    reject:   { label: 'Rechazar',   color: '#d32f2f', bg: '#ffebee', border: '#ef9a9a', align: 'left'  },
  };

  async function submitTicketAction(mode, text, extra = {}) {
    let nextStatus = form.status;
    let nextSla = form.sla;
    let commentText = text;

    if (mode === 'schedule') {
      const { date, time } = extra;
      commentText = `${text || 'Visita técnica programada'}: ${date} ${time}`;
      nextSla = `SCHEDULED:${date}T${time}:00`;
      nextStatus = 'SCHEDULED';
    }
    if (mode === 'solution') {
      nextStatus = 'RESOLVED';
    }
    if (mode === 'accept') {
      nextStatus = 'CLOSED';
      commentText = text || 'Solución aprobada';
    }
    if (mode === 'reject') {
      nextStatus = 'IN_PROGRESS';
      commentText = text || 'El usuario ha rechazado la solución. El ticket se ha reabierto.';
    }

    try {
      setSaving(true);
      setError('');
      
      const isStatusTransition = nextStatus !== form.status || nextSla !== form.sla;

      if (isStatusTransition) {
        // Unificamos el comentario con el cambio de estado en una sola llamada PUT
        const isStandard = isStandardUser(currentUser);
        const updatePayload = isStandard 
          ? { status: nextStatus, statusComment: commentText } 
          : { ...form, status: nextStatus, sla: nextSla, statusComment: commentText };

        const updatedTicket = await apiRequest(`/tickets/${selectedTicket.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        setSelectedTicket(updatedTicket);
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setForm(prev => ({ ...prev, status: nextStatus, sla: nextSla }));
        
        // Recargamos las actividades para ver el nuevo estado y el comentario unificado
        const updatedActivities = await apiRequest(`/tickets/${selectedTicket.id}/activities`);
        setActivities(updatedActivities);
      } else if (text && mode === 'comment') {
        // Solo es un comentario estándar (sin cambio de estado)
        const persistedAct = await apiRequest(`/tickets/${selectedTicket.id}/activities`, {
          method: 'POST',
          body: JSON.stringify({ 
            content: commentText, 
            type: 'COMMENT' 
          })
        });
        setActivities(prev => [persistedAct, ...prev]);
      }

      setComposeText('');
      setComposeMode(null);
      setScheduleDate('');
      setScheduleTime('');
    } catch(e) { 
      console.error(e);
      setError(e.message || 'Error al procesar la acción.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendComment() {
    if (composeMode === 'schedule') {
      if (!scheduleDate || !scheduleTime) return;
    } else {
      if (!composeText.trim()) return;
    }
    await submitTicketAction(composeMode, composeText, { date: scheduleDate, time: scheduleTime });
    setComposeText('');
    setComposeMode(null);
    setScheduleDate('');
    setScheduleTime('');
  }

  async function handleDeleteComment(id) {
    if (typeof id === 'string' && id.startsWith('act-')) {
      const realId = id.replace('act-', '');
      if (window.confirm('¿Estás seguro de que deseas eliminar este registro del historial?')) {
        try {
          await apiRequest(`/activities/${realId}`, { method: 'DELETE' });
          setActivities(prev => prev.filter(a => String(a.id) !== realId));
          setError('');
        } catch (e) {
          setError('No se pudo eliminar el comentario del historial.');
        }
      }
    } else {
      setLocalComments(prev => prev.filter(c => c.id !== id));
    }
  }

  function handleStartEdit(comment) {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  }

  async function handleSaveEdit(id) {
    if (typeof id === 'string' && id.startsWith('act-')) {
      const realId = id.replace('act-', '');
      try {
        await apiRequest(`/activities/${realId}`, {
          method: 'PUT',
          body: JSON.stringify({ content: editingText })
        });
        setActivities(prev => prev.map(a => String(a.id) === realId ? { ...a, newValue: editingText } : a));
      } catch (e) {
        setError('No se pudo guardar la edición.');
      }
    } else {
      setLocalComments(prev => prev.map(c => c.id === id ? { ...c, text: editingText, edited: true } : c));
    }
    setEditingCommentId(null);
    setEditingText('');
  }

  function handleCancelEdit() {
    setEditingCommentId(null);
    setEditingText('');
  }

  useEffect(() => {
    let ignore = false;

    Promise.all([
      apiRequest('/tickets'), 
      apiRequest('/locations'),
      apiRequest('/assets'),
      apiRequest('/users'),
      apiRequest('/categories?isActive=true'),
      apiRequest('/canned-responses')
    ]).then(([ticketsResponse, locationsResponse, assetsResponse, usersResponse, categoriesResponse, cannedResponseData]) => {
        if (!ignore) {
          setTickets(ticketsResponse);
          setLocations(locationsResponse);
          setAssets(assetsResponse);
          setUsers(usersResponse);
          setCategoriesConfig(categoriesResponse);
          setCannedResponses(cannedResponseData);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(requestError.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get('ticketId');
      if (ticketId) {
        const ticket = tickets.find(t => String(t.id) === String(ticketId));
        if (ticket) {
          handleSelectTicket(ticket);
        }
      }
    }
  }, [tickets]);

  useEffect(() => {
    setLocalComments([]);
    setComposeMode(null);
    setComposeText('');
    setScheduleDate('');
    setScheduleTime('');
    setEditingCommentId(null);
    setEditingText('');
  }, [selectedTicket?.id]);

  async function handleSubmit(event) { if (saving) return;
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setError('');

    try {
      if (selectedTicket) {
        const ticket = await apiRequest(`/tickets/${selectedTicket.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...form, subject: form.title }),
        });
        
        // Determine specific success message
        const wasUnassigned = !selectedTicket.assignedToId && !selectedTicket.secondaryAssignedToId;
        const isNowAssigned = ticket.assignedToId || ticket.secondaryAssignedToId;
        
        setTickets((currentTickets) => currentTickets.map(t => t.id === ticket.id ? ticket : t));
        setSelectedTicket(ticket);
        handleSelectTicket(ticket); // Synchronize form state with server response
        
        const updatedActs = await apiRequest(`/tickets/${ticket.id}/activities`).catch(() => []);
        setActivities(updatedActs);
        
        if (wasUnassigned && isNowAssigned) {
          setFeedback('Ticket asignado correctamente.');
        } else {
          setFeedback('Detalles actualizados correctamente.');
        }
      } else {
        const ticket = await apiRequest('/tickets', {
          method: 'POST',
          body: JSON.stringify({ ...form, subject: form.title }),
        });
        setTickets((currentTickets) => [ticket, ...currentTickets]);
        setForm(initialForm);
        setFeedback('Ticket creado y registrado correctamente.');
        const assetInput = document.getElementById('ticket-asset-search');
        if (assetInput) assetInput.value = '';
      }
      
      // Auto-clear feedback
      setTimeout(() => setFeedback(''), 5000);
      
    } catch (requestError) {
      setError(requestError.message);
      // Auto-clear error after longer time if it's a validation error
      setTimeout(() => setError(''), 8000);
    } finally {
      setSaving(false);
    }
  }

  function handleSelectTicket(ticket) {
    const url = new URL(window.location);
    url.searchParams.set('ticketId', ticket.id);
    window.history.pushState({}, '', url);

    setSelectedTicket(ticket);
    setForm({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      status: ticket.status || 'NEW',
      ticketType: ticket.ticketType || 'Incidencia',
      category: ticket.category || '',
      locationId: ticket.locationId || '',
      assetId: ticket.assetId || '',
      assignedToId: ticket.assignedToId || '',
      secondaryAssignedToId: ticket.secondaryAssignedToId || '',
      responsibleUserIds: getResponsibleUserIds(ticket),
      observerId: ticket.observerId || '',
      sla: ticket.sla || ''
    });
    setFeedback('');
    setError('');
    // Fetch real history
    apiRequest(`/tickets/${ticket.id}/activities`)
      .then(res => setActivities(res))
      .catch(e => console.error(e));

    setTimeout(() => {
      const assetInput = document.getElementById('ticket-asset-search');
      if (assetInput) assetInput.value = ticket.asset?.hostname || '';
    }, 100);
  }

  function downloadTickets(format) {
    let fileName = `reporte_tickets_${new Date().toISOString().slice(0, 10)}`;
    
    // Helper para obtener nombres de técnicos
    const getTechNames = (ticket) => {
      const ids = getResponsibleUserIds(ticket);
      if (!ids || ids.length === 0) return 'Sin asignar';
      return ids
        .map(id => users.find(u => String(u.id) === String(id))?.name)
        .filter(Boolean)
        .join(', ') || 'Sin asignar';
    };

    // Helper para obtener nombre de ubicación
    const getLocationName = (ticket) => {
      if (ticket.location?.name) return ticket.location.name;
      if (ticket.locationId) {
        const loc = locations.find(l => String(l.id) === String(ticket.locationId));
        return loc ? loc.name : 'N/A';
      }
      return 'N/A';
    };

    // Calcular el rango de fechas para el reporte
    let periodText = '';
    if (startDateFilter || endDateFilter) {
      const from = startDateFilter ? new Date(startDateFilter + 'T00:00:00').toLocaleDateString() : 'Inicio';
      const to = endDateFilter ? new Date(endDateFilter + 'T00:00:00').toLocaleDateString() : 'Hoy';
      periodText = `Periodo: ${from} - ${to}`;
    } else {
      const dates = filteredTickets.map(t => new Date(t.createdAt).getTime());
      if (dates.length > 0) {
        const minD = new Date(Math.min(...dates)).toLocaleDateString();
        const maxD = new Date(Math.max(...dates)).toLocaleDateString();
        periodText = (minD === maxD) ? `Fecha: ${minD}` : `Periodo: ${minD} - ${maxD}`;
      } else {
        periodText = 'Periodo: Histórico Total';
      }
    }

    if (format === 'excel' || format === 'XLS') {
      const headers = ['ID', 'TÍTULO', 'DESCRIPCIÓN', 'CATEGORÍA', 'PRIORIDAD', 'ESTADO', 'SOLICITANTE', 'TÉCNICOS ASIGNADOS', 'UBICACIÓN', 'FECHA CREACIÓN', 'FECHA RESOLUCIÓN'];
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"/><style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; }
          th { background-color: #002e5d; color: #ffffff; border: 1px solid #000000; padding: 10px; font-size: 12px; text-align: left; }
          td { border: 1px solid #cccccc; padding: 8px; font-size: 11px; vertical-align: top; }
          .header { font-size: 18px; font-weight: bold; color: #002e5d; margin-bottom: 5px; }
          .info { font-size: 12px; color: #666666; margin-bottom: 15px; }
        </style></head>
        <body>
          <div class="header">REPORTE DE TICKETS - MESA DE AYUDA</div>
          <div class="info">${periodText} | Generado: ${new Date().toLocaleString()} | Total: ${filteredTickets.length}</div>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${filteredTickets.map(t => `
                <tr>
                  <td>${t.id}</td>
                  <td>${t.title}</td>
                  <td>${stripHtml(t.description)}</td>
                  <td>${t.category || 'N/A'}</td>
                  <td>${getPriorityLabel(t.priority)}</td>
                  <td>${getStatusLabel(t.status)}</td>
                  <td>${t.createdBy?.name || 'Sistema'}</td>
                  <td>${getTechNames(t)}</td>
                  <td>${getLocationName(t)}</td>
                  <td>${new Date(t.createdAt).toLocaleString()}</td>
                  <td>${t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : 'Pendiente'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body></html>
      `;
      const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName + '.xls';
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Header Professional
      doc.setFontSize(20);
      doc.setTextColor(0, 46, 93);
      doc.text('REPORTE DE TICKETS', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Mesa de Ayuda - Gestión de Soporte', 14, 26);

      doc.text(periodText, 14, 32);
      doc.text(`Total tickets: ${filteredTickets.length}`, 14, 37);

      const sortedTickets = [...filteredTickets].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const tableData = sortedTickets.map(t => [
        t.id,
        t.title,
        t.category || 'N/A',
        getPriorityLabel(t.priority),
        getStatusLabel(t.status),
        t.createdBy?.name || 'Admin',
        getTechNames(t),
        getLocationName(t),
        new Date(t.createdAt).toLocaleString()
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['ID', 'Título', 'Categoría', 'Prioridad', 'Estado', 'Solicitante', 'Técnicos', 'Ubicación', 'Fecha Creación']],
        body: tableData,
        headStyles: { fillStyle: 'solid', fillColor: [0, 46, 93], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
          6: { cellWidth: 40 }
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 40, left: 14, right: 14 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`${fileName}.pdf`);
    } else if (format === 'PRINT') {
      const printWindow = window.open('', '_blank');
      const html = `
        <html>
          <head>
            <title>Reporte de Tickets - Mesa de Ayuda</title>
            <style>
              body { font-family: sans-serif; padding: 20px; font-size: 10px; }
              header { display: flex; justify-content: space-between; border-bottom: 2px solid #002e5d; padding-bottom: 10px; margin-bottom: 20px; }
              h1 { color: #002e5d; margin: 0; font-size: 18px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
              th { background-color: #f4f4f4; color: #002e5d; }
              tr:nth-child(even) { background-color: #fafafa; }
              .footer { margin-top: 20px; font-size: 8px; color: #666; text-align: center; }
            </style>
          </head>
          <body>
            <header>
              <div>
                <h1>REPORTE DE TICKETS MESA DE AYUDA</h1>
                <p>Listado de Soporte e Incidentes</p>
              </div>
              <div style="text-align: right">
                <p><strong>Fecha Generación:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Total Tickets:</strong> ${filteredTickets.length}</p>
              </div>
            </header>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Solicitante</th>
                  <th>Técnicos</th>
                  <th>Ubicación</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTickets.map(t => `
                  <tr>
                    <td><strong>${t.id}</strong></td>
                    <td>${t.title}</td>
                    <td>${t.category || '---'}</td>
                    <td>${getStatusLabel(t.status)}</td>
                    <td>${t.createdBy?.name || '---'}</td>
                    <td>${getTechNames(t)}</td>
                    <td>${getLocationName(t)}</td>
                    <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">Este documento es un extracto del sistema Mesa de Ayuda Municipal.</div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }

  function handleClearSelection() {
    const url = new URL(window.location);
    url.searchParams.delete('ticketId');
    window.history.pushState({}, '', url);

    setSelectedTicket(null);
    setForm(initialForm);
    setFeedback('');
    setError('');
    const assetSearch = document.getElementById('ticket-asset-search');
    if (assetSearch) assetSearch.value = '';
  }

  return (
    <div className="view-container">
      {selectedTicket ? (
        <div className="ticket-detail-shell" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {error && <div className="feedback error" style={{ marginBottom: '1rem', borderRadius: '8px' }}>{error}</div>}
          {feedback && <div className="feedback" style={{ marginBottom: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>{feedback}</div>}
          
          {/* TOP BAR */}
          <div className="ticket-detail-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#333', fontSize: '1.2rem', textTransform: 'uppercase' }}>TICKET ({selectedTicket.id})</h3>
            <button type="button" className="ticket-detail-back-btn" onClick={handleClearSelection} style={{ background: '#f0f2f5', border: '1px solid #ccc', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              - Volver a nuevo ticket
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ticket-detail-grid">
              
              {/* VERTICAL TABS MENU */}
              <div className="ticket-tabs-vertical" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', height: 'fit-content', overflow: 'hidden' }}>
                <div onClick={() => setActiveTab('ticket')} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e0e0e0', cursor: 'pointer', background: activeTab === 'ticket' ? '#f8f9fa' : 'transparent', fontWeight: activeTab === 'ticket' ? 700 : 400, borderLeft: activeTab === 'ticket' ? '3px solid #29b6f6' : '3px solid transparent' }}>
                  Ticket
                </div>
                <div onClick={() => setActiveTab('estadisticas')} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e0e0e0', cursor: 'pointer', background: activeTab === 'estadisticas' ? '#f8f9fa' : 'transparent', fontWeight: activeTab === 'estadisticas' ? 700 : 400, borderLeft: activeTab === 'estadisticas' ? '3px solid #29b6f6' : '3px solid transparent' }}>
                  Estadísticas
                </div>
                <div onClick={() => setActiveTab('elementos')} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e0e0e0', cursor: 'pointer', background: activeTab === 'elementos' ? '#f8f9fa' : 'transparent', fontWeight: activeTab === 'elementos' ? 700 : 400, borderLeft: activeTab === 'elementos' ? '3px solid #29b6f6' : '3px solid transparent' }}>
                  Elementos {selectedTicket.assetId && <span style={{float: 'right', background: '#e0edf9', color: '#002D62', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem'}}>1</span>}
                </div>
                <div onClick={() => setActiveTab('historico')} style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e0e0e0', cursor: 'pointer', background: activeTab === 'historico' ? '#f8f9fa' : 'transparent', fontWeight: activeTab === 'historico' ? 700 : 400, borderLeft: activeTab === 'historico' ? '3px solid #29b6f6' : '3px solid transparent' }}>
                  Histórico <span style={{float: 'right', background: '#e0edf9', color: '#002D62', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem'}}>{activities.length}</span>
                </div>
              </div>

              {/* CENTER COLUMN: Tab Content */}
              <div className="ticket-detail-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                
                {activeTab === 'ticket' && (
                  <>
                    {/* CHAT / TIMELINE */}
                    <div className="ticket-conversation-panel" style={{ border: '1.5px solid #d0d7de', borderRadius: '16px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '600px' }}>
                      <div className="ticket-conversation-scroll" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', flex: 1 }}>

                        {/* Initial Request */}
                        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                          <AvatarThumb
                            name={selectedTicket.createdBy?.name || 'Administrador'}
                            avatarUrl={selectedTicket.createdBy?.avatarUrl}
                            borderColor="#c8e6c9"
                          />
                          <div style={{ background: '#f1faf2', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '0.9rem 1.1rem', flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>
                                {new Date(selectedTicket.createdAt).toLocaleString()} &mdash; 
                                <button 
                                  type="button" 
                                  className="btn-ghost" 
                                  style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 700, color: '#002D62', background: 'transparent', display: 'inline', border: 'none' }}
                                  onClick={() => {
                                    const match = users.find(u => u.name === (selectedTicket.createdBy?.name || 'Administrador'));
                                    if (match) setViewingUserProfile(match);
                                  }}
                                >
                                  {selectedTicket.createdBy?.name || 'Administrador'}
                                </button>
                                <span style={{ marginLeft: '0.5rem', background: '#c8e6c9', color: '#2e7d32', padding: '0.05rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>Solicitud inicial</span>
                              </span>
                              {editingCommentId !== 'initial' && (
                                <button type="button" title="Editar solicitud" onClick={() => setEditingCommentId('initial')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.15rem 0.3rem', borderRadius: '4px', color: '#999', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#1976d2'; e.currentTarget.style.background = '#e3f2fd'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'none'; }}
                                >✏️</button>
                              )}
                            </div>

                            {editingCommentId === 'initial' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input
                                  autoFocus
                                  value={form.title}
                                  onChange={e => setForm({...form, title: e.target.value})}
                                  placeholder=""
                                  style={{ border: '1px solid #c8e6c9', borderRadius: '6px', padding: '0.45rem 0.6rem', fontSize: '0.95rem', fontWeight: 700, outline: 'none', color: '#2e7d32', fontFamily: 'inherit' }}
                                />
                                <textarea
                                  value={stripHtml(form.description)}
                                  onChange={e => setForm({...form, description: e.target.value})}
                                  placeholder=""
                                  rows={3}
                                  style={{ width: '100%', border: '1px solid #c8e6c9', borderRadius: '6px', padding: '0.5rem', fontSize: '0.88rem', resize: 'vertical', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button type="button" onClick={() => { setEditingCommentId(null); }} style={{ padding: '0.3rem 0.8rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', color: '#555' }}>Cancelar</button>
                                  <button type="button" onClick={() => { setEditingCommentId(null); }} style={{ padding: '0.3rem 0.8rem', border: 'none', borderRadius: '4px', background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Guardar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: 700, color: '#2e7d32', marginBottom: '0.3rem', fontSize: '0.95rem' }}>{form.title || selectedTicket.title}</div>
                                <div style={{ fontSize: '0.88rem', color: '#333' }} dangerouslySetInnerHTML={{ __html: form.description || selectedTicket.description || 'Sin descripcion' }} />
                              </>
                            )}
                          </div>
                        </div>


                        {[...visibleActivities].reverse().map(act => {
                          let displayValue = (
                            (
                              act.action === 'IN_PROGRESS'
                              && act.field === 'Estado'
                              && (act.newValue === 'Ticket asignado' || act.newValue === 'IN_PROGRESS')
                            )
                            || (act.action === 'UPDATED' && act.field === 'Responsables')
                            || (act.action === 'COMMENTED' && act.newValue === 'Ticket asignado')
                          ) ? 'Ticket asignado' : (act.newValue || act.action);
                          let sDate = undefined, sTime = undefined;
                          if (act.action === 'SCHEDULED' && displayValue) {
                            const match = displayValue.match(/^(.*?):\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
                            if (match) {
                               displayValue = match[1].trim() || 'Visita técnica programada';
                               sDate = match[2];
                               sTime = match[3];
                            } else {
                               const match2 = displayValue.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
                               if (match2) {
                                  displayValue = 'Visita técnica programada';
                                  sDate = match2[1];
                                  sTime = match2[2];
                               }
                            }
                          }
                          const isSystem = act.field !== 'Comentario' && act.action !== 'RESOLVED';
                          return {
                            id: "act-" + act.id,
                            author: act.user || "Sistema",
                            text: displayValue,
                            scheduleDate: sDate,
                            scheduleTime: sTime,
                            date: new Date(act.createdAt).toLocaleString(),
                            mode: act.action === 'RESOLVED' ? 'solution' : act.action === 'SCHEDULED' ? 'schedule' : 'comment',
                            isSystem,
                            ...(modeConfig[act.action === 'RESOLVED' ? 'solution' : act.action === 'SCHEDULED' ? 'schedule' : 'comment'] || modeConfig.comment)
                          };
                        }).concat(localComments).map(c => (
                          <div key={c.id} 
                            style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexDirection: c.align === 'right' ? 'row-reverse' : 'row' }}
                          >
                            <AvatarThumb
                              name={c.author}
                              avatarUrl={c.avatarUrl}
                              borderColor={c.border}
                            />
                            <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '0.9rem 1.1rem', flex: 1 }}>
                              <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                  {c.align === 'right' && <span style={{ background: c.border, color: c.color, padding: '0.05rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{c.label}</span>}
                                  <span>{c.date} &mdash; 
                                    <button 
                                      type="button" 
                                      className="btn-ghost" 
                                      style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 700, color: '#002D62', background: 'transparent', display: 'inline', border: 'none' }}
                                      onClick={() => {
                                        const match = users.find(u => u.name === c.author);
                                        if (match) setViewingUserProfile(match);
                                      }}
                                    >
                                      {c.author}
                                    </button>
                                  </span>
                                  {c.align !== 'right' && <span style={{ background: c.border, color: c.color, padding: '0.05rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{c.label}</span>}
                                  {c.edited && <span style={{ fontSize: '0.65rem', color: '#aaa', fontStyle: 'italic' }}>(editado)</span>}
                                </span>
                                {editingCommentId !== c.id && !c.isSystem && (
                                  <span style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                                    <button type="button" title="Editar" onClick={() => handleStartEdit(c)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: '0.1rem 0.25rem', borderRadius: '3px', color: '#bbb', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#1976d2'; e.currentTarget.style.background = '#e3f2fd'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'none'; }}
                                    >✏️</button>
                                    <button type="button" title="Eliminar" onClick={() => handleDeleteComment(c.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: '0.1rem 0.25rem', borderRadius: '3px', color: '#bbb', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#d32f2f'; e.currentTarget.style.background = '#ffebee'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'none'; }}
                                    >🗑️</button>
                                  </span>
                                )}
                              </div>

                              {/* Schedule info badge */}
                              {c.scheduleDate && c.scheduleTime && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '8px', padding: '0.4rem 0.8rem', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                                  <span style={{ fontSize: '1rem' }}>📅</span>
                                  <span style={{ fontWeight: 600, color: '#e65100' }}>
                                    {new Date(c.scheduleDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span style={{ color: '#bf360c', fontWeight: 700 }}>⏰ {c.scheduleTime}</span>
                                </div>
                              )}

                              {/* Edit mode */}
                              {editingCommentId === c.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <textarea
                                    autoFocus
                                    value={editingText}
                                    onChange={e => setEditingText(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '0.5rem', fontSize: '0.88rem', resize: 'vertical', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={handleCancelEdit} style={{ padding: '0.3rem 0.8rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', color: '#555' }}>Cancelar</button>
                                    <button type="button" onClick={() => handleSaveEdit(c.id)} style={{ padding: '0.3rem 0.8rem', border: 'none', borderRadius: '4px', background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.88rem', color: '#333', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {composeMode && (() => {
                        const cfg = modeConfig[composeMode];
                        return (
                          <div style={{ borderTop: `2px solid ${cfg.border}`, background: cfg.bg, padding: '1rem 1.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                              <span style={{ fontWeight: 700, color: cfg.color, fontSize: '0.85rem' }}>&#9999;&#65039; {cfg.label}</span>
                              <button type="button" onClick={() => { setComposeMode(null); setComposeText(''); setScheduleDate(''); setScheduleTime(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem' }}>&#x2715;</button>
                            </div>

                            {/* Schedule mode: date & time pickers */}
                            {composeMode === 'schedule' && (
                              <div style={{ 
                                background: '#fff', border: '1px solid #ffcc80', borderRadius: '10px', 
                                padding: '1rem', marginBottom: '0.8rem',
                                display: 'flex', flexDirection: 'column', gap: '0.8rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e65100', fontWeight: 600, fontSize: '0.85rem' }}>
                                  <span style={{ fontSize: '1.1rem' }}>📅</span> Programar visita técnica
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Fecha de visita *</label>
                                    <input 
                                      type="date" 
                                      value={scheduleDate} 
                                      onChange={e => setScheduleDate(e.target.value)}
                                      min={new Date().toISOString().split('T')[0]}
                                      required
                                      style={{ 
                                        border: '1.5px solid #ffcc80', borderRadius: '8px', padding: '0.55rem 0.7rem', 
                                        fontSize: '0.9rem', outline: 'none', background: '#fffbf5', cursor: 'pointer',
                                        fontFamily: 'inherit', color: '#333'
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <label style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, textTransform: 'uppercase' }}>Hora de visita *</label>
                                    <input 
                                      type="time" 
                                      value={scheduleTime} 
                                      onChange={e => setScheduleTime(e.target.value)}
                                      required
                                      style={{ 
                                        border: '1.5px solid #ffcc80', borderRadius: '8px', padding: '0.55rem 0.7rem', 
                                        fontSize: '0.9rem', outline: 'none', background: '#fffbf5', cursor: 'pointer',
                                        fontFamily: 'inherit', color: '#333'
                                      }}
                                    />
                                  </div>
                                </div>
                                {scheduleDate && scheduleTime && (
                                  <div style={{ 
                                    background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', 
                                    padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    fontSize: '0.82rem', color: '#2e7d32'
                                  }}>
                                    <span style={{ fontSize: '1rem' }}>✅</span>
                                    <span>
                                      Visita programada para el <strong>{new Date(scheduleDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> a las <strong>{scheduleTime}</strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Searchable Dropdown for Canned Responses */}
                            {(!isStandardUser(currentUser) && (composeMode === 'comment' || composeMode === 'solution')) && (
                              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                  <label style={{ fontSize: '0.78rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>
                                    Respuestas Predeterminadas
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => { setSaveCannedMode(!saveCannedMode); setNewCannedTitle(''); }}
                                    title="Guardar esta respuesta como predeterminada"
                                    style={{ 
                                      background: saveCannedMode ? '#0277bd' : 'none', 
                                      border: '1px solid #0277bd', borderRadius: '4px', 
                                      padding: '0.2rem 0.6rem', color: saveCannedMode ? '#fff' : '#0277bd', 
                                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' 
                                    }}
                                  >
                                    {saveCannedMode ? 'Ocultar guardado' : '+ Guardar respuesta'}
                                  </button>
                                </div>

                                {saveCannedMode ? (
                                  <div style={{ 
                                    background: '#e1f5fe', border: '1px solid #4fc3f7', borderRadius: '8px', 
                                    padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                  }}>
                                    <div style={{ fontSize: '0.85rem', color: '#01579b', fontWeight: 700, borderBottom: '1px solid #b3e5fc', paddingBottom: '0.4rem' }}>
                                      💾 Guardar como respuesta predeterminada
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600 }}>Título para la respuesta *</label>
                                      <input 
                                        placeholder=""
                                        value={newCannedTitle}
                                        onChange={e => setNewCannedTitle(e.target.value)}
                                        style={{ border: '1px solid #b3e5fc', borderRadius: '6px', padding: '0.5rem', fontSize: '0.88rem', outline: 'none' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <label style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600 }}>Categoría</label>
                                      <select 
                                        value={form.category || 'General'} 
                                        onChange={() => {}} // Category is picked from ticket by default
                                        style={{ background: '#fff', border: '1px solid #b3e5fc', borderRadius: '6px', padding: '0.5rem', fontSize: '0.88rem', outline: 'none', color: '#666' }}
                                        disabled
                                      >
                                        <option value={form.category || 'General'}>{form.category || 'General'}</option>
                                      </select>
                                      <span style={{ fontSize: '0.65rem', color: '#888' }}>Se guardará bajo la categoría actual del ticket.</span>
                                    </div>
                                    <div style={{ background: '#fff', border: '1px dashed #b3e5fc', borderRadius: '6px', padding: '0.6rem', fontSize: '0.78rem', color: '#666' }}>
                                      <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 700 }}>Vista previa del contenido:</div>
                                      {composeText ? composeText.slice(0, 80) + (composeText.length > 80 ? '...' : '') : <span style={{color: '#d32f2f'}}>No hay contenido escrito en la solución</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.4rem' }}>
                                      <button type="button" onClick={() => setSaveCannedMode(false)} style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.8rem', cursor: 'pointer', color: '#555' }}>Cerrar</button>
                                      <button 
                                        type="button" 
                                        disabled={!newCannedTitle || !composeText}
                                        onClick={async () => {
                                          try {
                                            const payload = { 
                                              category: form.category || 'General', 
                                              title: newCannedTitle, 
                                              content: composeText,
                                              ticketType: selectedTicket?.ticketType || 'Incidencia'
                                            };
                                            const saved = await apiRequest('/canned-responses', {
                                              method: 'POST',
                                              body: JSON.stringify(payload)
                                            });
                                            setCannedResponses([saved, ...cannedResponses]);
                                            setSaveCannedMode(false);
                                            setNewCannedTitle('');
                                          } catch (e) {
                                            console.error("Error saving canned response:", e);
                                            setError('No se pudo guardar la respuesta predeterminada.');
                                          }
                                        }}
                                        style={{ 
                                          background: (newCannedTitle && composeText) ? '#0277bd' : '#b0bec5', 
                                          color: '#fff', border: 'none', borderRadius: '6px', 
                                          padding: '0.4rem 1.2rem', fontSize: '0.8rem', fontWeight: 700, 
                                          cursor: (newCannedTitle && composeText) ? 'pointer' : 'not-allowed', 
                                          transition: 'all 0.2s',
                                          boxShadow: (newCannedTitle && composeText) ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                      >Guardar Respuesta</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ position: 'relative' }}>
                                    <input 
                                      type="text"
                                      placeholder=""
                                      value={cannedSearch}
                                      onChange={e => { setCannedSearch(e.target.value); setShowCannedList(true); }}
                                      onFocus={() => setShowCannedList(true)}
                                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                                    />
                                    
                                    {showCannedList && (
                                      <div style={{ 
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                        background: '#fff', border: '1px solid #ccc', borderRadius: '8px', 
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.15)', marginTop: '0.4rem', 
                                        maxHeight: '220px', overflowY: 'auto' 
                                      }}>
                                        {cannedResponses
                                          .filter(r => {
                                            const matchesSearch = 
                                              r.title.toLowerCase().includes(cannedSearch.toLowerCase()) || 
                                              (r.category && r.category.toLowerCase().includes(cannedSearch.toLowerCase()));
                                            
                                            // Prefer current ticket type if available
                                            const ticketType = selectedTicket?.ticketType || 'Incidencia';
                                            return matchesSearch && (r.ticketType === ticketType || !r.ticketType || r.ticketType === 'General');
                                          }).length === 0 ? (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>No se encontraron respuestas.</div>
                                          ) : (
                                            cannedResponses
                                              .filter(r => {
                                                const matchesSearch = 
                                                  r.title.toLowerCase().includes(cannedSearch.toLowerCase()) || 
                                                  (r.category && r.category.toLowerCase().includes(cannedSearch.toLowerCase()));
                                                const ticketType = selectedTicket?.ticketType || 'Incidencia';
                                                return matchesSearch && (r.ticketType === ticketType || !r.ticketType || r.ticketType === 'General');
                                              }).map((resp, idx) => (
                                                <div 
                                                  key={idx}
                                                  onClick={() => { setComposeText(resp.content || resp.text); setShowCannedList(false); setCannedSearch(''); }}
                                                  style={{ 
                                                    padding: '0.7rem 1rem', borderBottom: '1px solid #f0f0f0', 
                                                    cursor: 'pointer', transition: 'background 0.2s',
                                                    display: 'flex', flexDirection: 'column'
                                                  }}
                                                  onMouseEnter={e => e.currentTarget.style.background = '#f5f9ff'}
                                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 700, color: '#01579b', fontSize: '0.88rem' }}>{resp.title}</div>
                                                    {resp.shortcut && <span style={{ fontSize: '0.7rem', color: '#999', background: '#eee', padding: '1px 5px', borderRadius: '4px' }}>{resp.shortcut}</span>}
                                                  </div>
                                                  <div style={{ fontSize: '0.72rem', color: '#888' }}>{resp.category || 'General'} • {(resp.content || resp.text || '').slice(0, 80)}...</div>
                                                </div>
                                              ))
                                          )}
                                          <div 
                                            onClick={() => setShowCannedList(false)}
                                            style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#0277bd', cursor: 'pointer', background: '#f8f9fa' }}
                                          >Cerrar buscador</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <textarea value={composeText} onChange={e => setComposeText(e.target.value)}
                              placeholder={composeMode === 'schedule' ? 'Notas adicionales sobre la visita (opcional)...' : `Escribe tu ${cfg.label.toLowerCase()} aqui...`} 
                              rows={composeMode === 'schedule' ? 2 : 4}
                              style={{ width: '100%', border: `1px solid ${cfg.border}`, borderRadius: '8px', padding: '0.7rem', fontSize: '0.9rem', resize: 'vertical', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.7rem', marginTop: '0.6rem' }}>
                              <button type="button" onClick={() => { setComposeMode(null); setComposeText(''); setScheduleDate(''); setScheduleTime(''); }} style={{ padding: '0.45rem 1.1rem', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                              <button type="button" onClick={handleSendComment} 
                                disabled={composeMode === 'schedule' ? (!scheduleDate || !scheduleTime) : !composeText.trim()}
                                style={{ 
                                  padding: '0.45rem 1.3rem', border: 'none', borderRadius: '6px', 
                                  background: (composeMode === 'schedule' ? (!scheduleDate || !scheduleTime) : !composeText.trim()) ? '#ccc' : cfg.color, 
                                  color: '#fff', cursor: (composeMode === 'schedule' ? (!scheduleDate || !scheduleTime) : !composeText.trim()) ? 'not-allowed' : 'pointer', 
                                  fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' 
                                }}
                              >
                                {composeMode === 'schedule' ? '📅 Programar visita' : `Enviar ${cfg.label}`}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="ticket-detail-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {(() => {
                        const standard = isStandardUser(currentUser);
                        const isResolved = selectedTicket.status === 'RESOLVED';
                        const isClosed = selectedTicket.status === 'CLOSED';
                        
                        if (isClosed) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.2rem', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '1.1rem' }}>🔒</span> Ticket cerrado - No se admiten más comentarios
                            </div>
                          );
                        }

                        let modes = [];
                        if (standard) {
                          if (isResolved) {
                            modes = [['accept','&#9989; Aceptar','#2e7d32'], ['reject','&#x2715; Rechazar','#d32f2f']];
                          } else {
                            modes = [['comment','&#128172; Comentario','#607d8b']];
                          }
                        } else {
                          modes = [['comment','&#128172; Comentario','#607d8b'],['schedule','&#128197; Programar','#e65100'],['solution','&#9989; Solucion','#0277bd']];
                        }

                        return modes.map(([mode, lbl, clr]) => (
                          <button key={mode} type="button"
                            disabled={isResolved}
                            onClick={() => { 
                              if (isResolved) return;
                              if (mode === 'accept') {
                                submitTicketAction('accept', 'Solución aprobada');
                              } else {
                                setComposeMode(composeMode === mode ? null : mode); 
                                setComposeText(''); 
                                setScheduleDate(''); 
                                setScheduleTime(''); 
                              }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.4rem', border: `2px solid ${isResolved ? '#cbd5e1' : clr}`, borderRadius: '20px', background: isResolved ? '#f1f5f9' : (composeMode === mode ? clr : '#fff'), color: isResolved ? '#94a3b8' : (composeMode === mode ? '#fff' : clr), fontWeight: 600, fontSize: '0.85rem', cursor: isResolved ? 'not-allowed' : 'pointer', opacity: isResolved ? 0.6 : 1, transition: 'all 0.18s' }}
                            dangerouslySetInnerHTML={{ __html: lbl }}
                          />
                        ));
                      })()}
                    </div>

                    {/* UPLOAD AREA */}
                    <div style={{ border: '1px dashed #ccc', background: '#f8fbfc', padding: '1.2rem', textAlign: 'center', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={() => document.getElementById('ticket-files').click()}>
                      <input id="ticket-files" type="file" multiple style={{ display: 'none' }} />
                      <p style={{ fontWeight: 600, marginBottom: '0.4rem', color: '#002D62', fontSize: '0.9rem' }}>&#128206; Archivo(s) - 10 MB max</p>
                      <div style={{ display: 'inline-flex', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden', background: '#fff' }}>
                        <button type="button" style={{ background: '#fff', border: 'none', borderRight: '1px solid #d9d9d9', padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem', pointerEvents: 'none' }}>Elegir archivos</button>
                        <span style={{ padding: '0.45rem 0.9rem', color: '#888', fontSize: '0.85rem' }}>Sin archivos seleccionados</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                      <button type="submit" disabled={saving} style={{ background: '#f4c33d', color: '#000', border: 'none', padding: '0.65rem 2.5rem', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </>
                )}

                {activeTab === 'estadisticas' && (() => {
                  const diffHMS = (d1, d2) => {
                    if (!d1 || !d2) return '—';
                    const diff = Math.abs(new Date(d2) - new Date(d1));
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    const parts = [];
                    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
                    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
                    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
                    return parts.join(' ');
                  };

                  const formatDate = (date) => {
                    if (!date) return 'Pendiente';
                    const d = new Date(date);
                    return (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#334155', fontWeight: 700, fontSize: '0.9rem' }}>{d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    );
                  };

                  const timelineEvents = [
                    { label: 'Tomar en consideración', date: selectedTicket.createdAt, icon: '✓', color: '#888' },
                    { label: 'Fecha de apertura', date: selectedTicket.createdAt, icon: '*', color: '#888' },
                    { label: 'Fecha de asignación', date: selectedTicket.assignedAt, icon: '✓', clock: true },
                    { label: 'Fecha de solución', date: selectedTicket.resolvedAt, icon: '✓', clock: true },
                    { label: 'Fecha de cierre', date: selectedTicket.closedAt, icon: '⚑', color: '#888' },
                  ];

                  // Calculate 'En espera' from activities if status was POSTPONED
                  const calculateWaitTime = () => {
                    if (!activities || activities.length === 0) return 0;
                    let totalMs = 0;
                    let lastPostponedAt = null;
                    
                    [...activities].reverse().forEach(act => {
                      if (act.newValue === 'POSTPONED') {
                        lastPostponedAt = new Date(act.createdAt);
                      } else if (lastPostponedAt && act.oldValue === 'POSTPONED') {
                        totalMs += (new Date(act.createdAt) - lastPostponedAt);
                        lastPostponedAt = null;
                      }
                    });

                    if (lastPostponedAt) totalMs += (new Date() - lastPostponedAt);
                    return totalMs;
                  };

                  const waitTimeMs = calculateWaitTime();
                  const waitTimeStr = waitTimeMs > 0 ? diffHMS(0, waitTimeMs) : '0 segundos';

                  return (
                    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2rem', minHeight: '500px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                      
                      <section>
                        <h4 style={{ margin: '0 0 2rem 0', fontWeight: 700, color: '#1a1a1a', fontSize: '1.1rem' }}>Fechas</h4>
                        <div style={{ position: 'relative', paddingLeft: '180px' }}>
                          <div style={{ position: 'absolute', left: '205px', top: '10px', bottom: '10px', width: '2px', background: '#e0e0e0' }} />
                          
                          {timelineEvents.map((ev, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: idx === timelineEvents.length - 1 ? 0 : '2.5rem', zIndex: 1, position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '-180px', width: '160px' }}>
                                {formatDate(ev.date)}
                              </div>
                              <div style={{ 
                                width: '28px', height: '28px', background: '#fff', 
                                border: ev.icon === '*' ? 'none' : '2px solid #bdbdbd', 
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                margin: '0 1rem', position: 'absolute', left: '12px', 
                                fontSize: ev.icon === '*' ? '1.5rem' : '0.9rem', color: '#666',
                                fontWeight: 700, boxShadow: '0 0 0 4px #fff'
                              }}>
                                {ev.icon}
                              </div>
                              <div style={{ marginLeft: '60px', color: '#334155', fontSize: '0.92rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                {ev.label} 
                                {ev.clock && <span style={{fontSize: '1.1rem', color: '#1e293b'}}>⏱</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section style={{ borderTop: '1px solid #f1f5f9', paddingTop: '2rem' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 700, color: '#1a1a1a', fontSize: '1.1rem' }}>Horas</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.6rem' }}>
                            <span style={{ color: '#64748b' }}>Tomar en consideración</span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>1 segundo</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.6rem' }}>
                            <span style={{ color: '#64748b' }}>Solución <small>(Tiempo total hasta resolver)</small></span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{diffHMS(selectedTicket.createdAt, selectedTicket.resolvedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid #f8fafc', paddingBottom: '0.6rem' }}>
                            <span style={{ color: '#64748b' }}>ANS <small>(Desempeño sobre el tiempo límite)</small></span>
                            {(() => {
                              const slaInfo = getSlaInfo(selectedTicket.createdAt, selectedTicket.sla, selectedTicket.resolvedAt || selectedTicket.closedAt, selectedTicket.status);
                              if (!selectedTicket.sla) return <span style={{ fontWeight: 600, color: '#94a3b8' }}>Sin límite</span>;
                              
                              const { isOverdue, remainingStr } = slaInfo;
                              
                              if (!selectedTicket.resolvedAt && !selectedTicket.closedAt && !isOverdue) {
                                return <span style={{ fontWeight: 600, color: '#0ea5e9' }}>Positivo (+ {remainingStr.replace(' restantes', '')})</span>;
                              }
                              
                              return (
                                <span style={{ fontWeight: 700, color: isOverdue ? '#d32f2f' : '#2e7d32' }}>
                                  {isOverdue ? 'Negativo (-' : 'Positivo (+' } {remainingStr.replace(' restantes', '').replace('Vencido', '')})
                                </span>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span style={{ color: '#64748b' }}>En espera <small>(Tiempo acumulado en pausa)</small></span>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{waitTimeStr}</span>
                          </div>
                        </div>
                      </section>

                    </div>
                  );
                })()}

                {activeTab === 'historico' && (
                  <div className="ticket-history-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="ticket-history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Línea de Tiempo</h3>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{activities.length} eventos registrados</div>
                      </div>
                      <div style={{ background: '#e2e8f0', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Auditoría</div>
                    </div>
                    
                    <div style={{ padding: '1.5rem', maxHeight: '500px', overflowY: 'auto', background: '#ffffff' }}>
                      <div style={{ position: 'relative', paddingLeft: '2.2rem' }}>
                        {/* Eje de la línea de tiempo */}
                        <div style={{ position: 'absolute', left: '0.75rem', top: '0.5rem', bottom: '0.5rem', width: '2px', background: '#f1f5f9' }} />
                        
                        {activities.length === 0 ? (
                          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📋</div>
                            No hay historial registrado para este ticket.
                          </div>
                        ) : (
                          [...activities].reverse().map((act, idx) => {
                            const formatFieldName = (f) => {
                              if (!f) return 'Detalle';
                              const norm = String(f).trim().toLowerCase();
                              if (norm === 'sla' || norm === 'ans') return 'ANS';
                              if (norm === 'locationid' || norm === 'location' || norm === 'ubicacion' || norm === 'ubicación') return 'Ubicación';
                              if (norm === 'tickettype' || norm === 'tipo') return 'Tipo';
                              if (norm === 'category' || norm === 'categoria' || norm === 'categoría') return 'Categoría';
                              if (norm === 'priority' || norm === 'prioridad') return 'Prioridad';
                              if (norm === 'status' || norm === 'estado') return 'Estado';
                              if (norm === 'title' || norm === 'titulo' || norm === 'título') return 'Título';
                              if (norm === 'description' || norm === 'descripcion' || norm === 'descripción') return 'Descripción';
                              if (norm === 'responsibleuserids' || norm === 'assignedtoid' || norm === 'responsables' || norm === 'técnico asignado' || norm === 'tecnico asignado') return 'Técnico Asignado';
                              if (norm === 'observerid' || norm === 'seguimiento') return 'Seguimiento';
                              if (norm === 'comment' || norm === 'comentario') return 'Comentario';
                              return f.charAt(0).toUpperCase() + f.slice(1);
                            };

                            const formatAction = (activity) => {
                              const normField = activity.field ? String(activity.field).trim().toLowerCase() : '';
                              if (normField && normField !== 'estado' && normField !== 'status' && normField !== 'comentario' && normField !== 'comment') {
                                return formatFieldName(activity.field).toUpperCase();
                              }
                              const m = { 
                                'CREATED': 'CREADO', 'UPDATED': 'ACTUALIZADO', 'SCHEDULED': 'PROGRAMADO', 
                                'IN_PROGRESS': 'EN PROGRESO', 'RESOLVED': 'RESUELTO', 'CLOSED': 'CERRADO', 
                                'NEW': 'NUEVO', 'OPEN': 'ABIERTO', 'COMMENT': 'COMENTARIO', 'COMMENTED': 'COMENTARIO', 'POSTPONED': 'POSPUESTO' 
                              };
                              return m[activity.action] || activity.action;
                            };

                            const formatValue = (v, fieldName) => {
                              if (!v || v === 'Ninguno' || v === 'Desconocida' || v === 'Sin asignar' || v === 'Sin Asignar' || v === 'Sin Ubicación' || v === 'Sin ANS' || v === 'Sin Categoría' || v === 'Sin Tipo') return v || 'Sin dato';
                              
                              const normField = fieldName ? String(fieldName).trim().toLowerCase() : '';

                              // 1. Resolver ID de Ubicación
                              if (normField === 'locationid' || normField === 'ubicacion' || normField === 'ubicación') {
                                const matchedLoc = locations.find(l => String(l.id) === String(v));
                                if (matchedLoc) return matchedLoc.name;
                              }

                              // 2. Resolver ID de Usuario / Observador
                              if (normField === 'observerid' || normField === 'seguimiento') {
                                const matchedUser = users.find(u => String(u.id) === String(v));
                                if (matchedUser) return matchedUser.name;
                              }

                              // 3. Nombres de Estado y Prioridad
                              const m = { 
                                'NEW': 'Nuevo', 'OPEN': 'Abierto', 'IN_PROGRESS': 'En Progreso', 
                                'RESOLVED': 'Resuelto', 'CLOSED': 'Cerrado', 'SCHEDULED': 'Programado',
                                'POSTPONED': 'Pospuesto',
                                'LOW': 'Baja', 'MEDIUM': 'Media', 'HIGH': 'Alta', 'URGENT': 'Urgente'
                              };
                              return m[v] || v;
                            };

                            const mapUserIdsToNames = (valStr) => {
                              if (!valStr || valStr === 'Sin asignar' || valStr === 'Sin Asignar' || valStr === 'Ninguno' || valStr === 'Desconocida') return valStr;
                              const ids = String(valStr).split(',').map(s => s.trim()).filter(Boolean);
                              const mapped = ids.map(id => {
                                const user = users.find(u => String(u.id) === id);
                                return user ? user.name : id;
                              });
                              return mapped.join(', ');
                            };

                            const displayField = formatFieldName(act.field);
                            const normF = act.field ? String(act.field).trim().toLowerCase() : '';

                            // Colores según acción y campo
                            let dotColor = '#64748b'; // default
                            let actionBg = '#f1f5f9';
                            let actionColor = '#475569';

                            if (act.action === 'CREATED') {
                              dotColor = '#10b981'; actionBg = '#ecfdf5'; actionColor = '#059669';
                            } else if (act.action === 'RESOLVED') {
                              dotColor = '#3b82f6'; actionBg = '#eff6ff'; actionColor = '#2563eb';
                            } else if (act.action === 'COMMENTED') {
                              dotColor = '#8b5cf6'; actionBg = '#f5f3ff'; actionColor = '#7c3aed';
                            } else if (act.action === 'SCHEDULED') {
                              dotColor = '#f59e0b'; actionBg = '#fffbeb'; actionColor = '#d97706';
                            } else if (normF === 'estado' || normF === 'status') {
                              dotColor = '#6366f1'; actionBg = '#eef2ff'; actionColor = '#4f46e5';
                            } else if (normF.includes('tecnico') || normF.includes('técnico') || normF.includes('responsable')) {
                              dotColor = '#0284c7'; actionBg = '#f0f9ff'; actionColor = '#0369a1';
                            } else if (normF.includes('categor')) {
                              dotColor = '#059669'; actionBg = '#ecfdf5'; actionColor = '#047857';
                            } else if (normF === 'tipo' || normF === 'tickettype') {
                              dotColor = '#d97706'; actionBg = '#fffbeb'; actionColor = '#b45309';
                            } else if (normF === 'ans' || normF === 'sla') {
                              dotColor = '#ea580c'; actionBg = '#fff7ed'; actionColor = '#c2410c';
                            } else if (normF.includes('ubicacion') || normF.includes('ubicación') || normF === 'locationid') {
                              dotColor = '#8b5cf6'; actionBg = '#f5f3ff'; actionColor = '#6d28d9';
                            } else if (normF.includes('seguimiento') || normF === 'observerid') {
                              dotColor = '#0ea5e9'; actionBg = '#f0fdfa'; actionColor = '#0f766e';
                            } else if (normF.includes('priorid')) {
                              dotColor = '#ef4444'; actionBg = '#fef2f2'; actionColor = '#b91c1c';
                            }

                            return (
                              <div key={act.id} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                {/* Dot Indicator */}
                                <div style={{ 
                                  position: 'absolute', left: '-1.85rem', top: '0.25rem', 
                                  width: '10px', height: '10px', borderRadius: '50%', 
                                  background: dotColor, border: '2px solid #fff', boxShadow: '0 0 0 1px #f1f5f9', zIndex: 2 
                                }} />
                                
                                <div style={{ background: idx === 0 ? '#f8fafc' : 'transparent', padding: idx === 0 ? '0.75rem' : '0', borderRadius: '8px', border: idx === 0 ? '1px solid #f1f5f9' : 'none' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{act.user || 'Sistema'}</span>
                                        <span style={{ 
                                          fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px',
                                          background: actionBg, color: actionColor, textTransform: 'uppercase'
                                        }}>
                                          {formatAction(act)}
                                        </span>
                                      </div>
                                      
                                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                                        {act.action === 'CREATED' ? (
                                          <span style={{ color: '#059669', fontWeight: 500 }}>Creó el ticket inicial</span>
                                        ) : act.action === 'COMMENTED' ? (
                                          <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid #8b5cf6', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                                            {(() => {
                                              const cleanContent = (act.newValue || '').trim();
                                              const matchingCanned = cannedResponses.find(r => (r.content || r.text || '').trim() === cleanContent);
                                              
                                              return matchingCanned ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                  <span style={{ color: '#7c3aed', fontWeight: 700 }}>Respuesta:</span>
                                                  <span style={{ color: '#334155', fontWeight: 600 }}>{matchingCanned.title}</span>
                                                </div>
                                              ) : (
                                                <div style={{ color: '#475569', fontStyle: 'italic' }}>"{act.newValue}"</div>
                                              );
                                            })()}
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#64748b' }}>{displayField}:</strong>
                                            {act.oldValue && act.oldValue !== 'Ninguno' && act.oldValue !== 'Desconocida' && act.oldValue !== 'Sin asignar' && act.oldValue !== 'Sin Asignar' && act.oldValue !== 'Sin Ubicación' && act.oldValue !== 'Sin ANS' && act.oldValue !== 'Sin Categoría' && act.oldValue !== 'Sin Tipo' && (
                                              <>
                                                <span style={{ color: '#94a3b8' }}>
                                                  {(normF.includes('tecnico') || normF.includes('responsable') || normF.includes('seguimiento') || normF === 'observerid')
                                                    ? mapUserIdsToNames(act.oldValue)
                                                    : formatValue(act.oldValue, act.field)}
                                                </span>
                                                <span style={{ color: '#cbd5e1' }}>→</span>
                                              </>
                                            )}
                                            <span style={{ fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                              {(normF.includes('tecnico') || normF.includes('responsable') || normF.includes('seguimiento') || normF === 'observerid')
                                                ? mapUserIdsToNames(act.newValue)
                                                : formatValue(act.newValue, act.field)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                        {new Date(act.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                        {new Date(act.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'elementos' && (() => {
                  const asset = assets.find(a => a.id === selectedTicket.assetId);
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8fbfc', borderBottom: '1px solid #e0e0e0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontWeight: 600, color: '#111', fontSize: '0.95rem' }}>Elementos asociados</h4>
                        {asset && <span style={{ background: asset.status === 'ONLINE' ? '#e8f5e9' : '#fce4ec', color: asset.status === 'ONLINE' ? '#2e7d32' : '#c62828', padding: '0.2rem 0.7rem', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>{asset.status || 'Desconocido'}</span>}
                      </div>
                      {!asset ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                          🖥️<br/>No hay ningún elemento asociado a este ticket.
                        </div>
                      ) : (
                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem 2rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Hostname</div>
                            <div style={{ fontWeight: 700, color: '#002D62', fontSize: '1rem' }}>{asset.hostname || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Tipo de dispositivo</div>
                            <div style={{ color: '#333' }}>{asset.deviceType || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Marca / Modelo</div>
                            <div style={{ color: '#333' }}>{[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>N° Serial</div>
                            <div style={{ color: '#333', fontFamily: 'monospace' }}>{asset.serialNumber || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Sistema operativo</div>
                            <div style={{ color: '#333' }}>{[asset.osType, asset.osVersion].filter(Boolean).join(' ') || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Dirección IP</div>
                            <div style={{ color: '#333', fontFamily: 'monospace' }}>{asset.ipAddress || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Ubicación</div>
                            <div style={{ color: '#333' }}>{asset.location || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Usuario asignado</div>
                            <div style={{ color: '#333' }}>{asset.assignedUser || '—'}</div>
                          </div>
                          {asset.cpuModel && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Procesador</div>
                              <div style={{ color: '#333', fontSize: '0.85rem' }}>{asset.cpuModel}</div>
                            </div>
                          )}
                          {asset.ramSummary && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 600 }}>Memoria RAM</div>
                              <div style={{ color: '#333', fontSize: '0.85rem' }}>{asset.ramSummary}</div>
                            </div>
                          )}
                          {asset.lastSeenAt && (
                            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #eee', paddingTop: '0.8rem', marginTop: '0.3rem' }}>
                              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Última conexión: <strong>{new Date(asset.lastSeenAt).toLocaleString()}</strong></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* RIGHT COLUMN: Ticket Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e9ecef', height: 'fit-content' }}>
                  
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Estado</label>
                  <select 
                    value={form.status} 
                    onChange={(e) => setForm({...form, status: e.target.value})} 
                    disabled={isStandardUser(currentUser)}
                    style={{ background: isStandardUser(currentUser) ? '#f1f5f9' : '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem', cursor: isStandardUser(currentUser) ? 'not-allowed' : 'default' }}
                  >
                    <option value="NEW">Nuevo</option>
                    <option value="IN_PROGRESS">En Progreso</option>
                    <option value="SCHEDULED">Programado</option>
                    <option value="RESOLVED">Resuelto</option>
                    <option value="CLOSED">Cerrado</option>
                  </select>
                </div>

	                {canConfigureTicket ? (
	                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
	                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Tipo</label>
	                  <select value={form.ticketType || ''} onChange={(e) => setForm({...form, ticketType: e.target.value, category: '', sla: ''})} style={{ background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem' }}>
	                    <option value="">Seleccionar tipo...</option>
	                    <option value="Incidencia">Incidencia</option>
	                    <option value="Solicitud">Solicitud</option>
	                  </select>
	                </div>
	                ) : null}

	                {canConfigureTicket ? (
	                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
	                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Categoría *</label>
	                  <CategorySelector 
                      categoriesConfig={categoriesConfig}
                      ticketType={form.ticketType}
                      value={form.category}
                      onChange={(selectedCat) => {
                        setForm({...form, category: selectedCat.name, sla: selectedCat.sla || form.sla});
                      }}
                    />
	                </div>
	                ) : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Elementos asociados</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #ced4da', paddingBottom: '0.2rem', opacity: isStandardUser(currentUser) ? 0.7 : 1 }}>
                    <span style={{color: '#666', marginRight: '0.5rem'}}>🔍</span>
                    <input 
                      list="asset-datalist" 
                      placeholder="" 
                      readOnly={isStandardUser(currentUser)}
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.2rem 0', fontSize: '0.9rem', cursor: isStandardUser(currentUser) ? 'not-allowed' : 'text' }} 
                      onChange={(e) => { const selected = assets.find(a => a.hostname === e.target.value); if (selected) { const locMatch = selected.location ? locations.find(l => l.name === selected.location) : null; setForm({ ...form, assetId: selected.id, locationId: locMatch ? String(locMatch.id) : form.locationId }); } else { setForm({...form, assetId: ''}); } }} 
                      defaultValue={selectedTicket.asset?.hostname || ''} 
                    />
                    {!isStandardUser(currentUser) && (
                      <datalist id="asset-datalist">
                        {assets.filter(a => { const selLoc = locations.find(l => String(l.id) === String(form.locationId)); return !selLoc || a.location === selLoc.name; }).map((a) => <option key={a.id} value={a.hostname} />)}
                      </datalist>
                    )}
                  </div>
                </div>

	                {canConfigureTicket ? (
	                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
	                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>ANS (Tiempo)</label>
	                  <select value={form.sla && form.sla.startsWith('SCHEDULED:') ? 'custom' : (form.sla || '')} onChange={(e) => setForm({...form, sla: e.target.value === 'custom' ? form.sla : e.target.value})} style={{ background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem' }}>
	                    <option value="">Sin ANS</option>
                    <option value="2h">2 horas</option>
                    <option value="4h">4 horas</option>
                    <option value="8h">8 horas</option>
                    <option value="24h">24 horas</option>
                    <option value="48h">48 horas</option>
	                    {form.sla && form.sla.startsWith('SCHEDULED:') && <option value="custom">A medida (Visita Programada)</option>}
	                  </select>
	                </div>
	                ) : null}

	                {canConfigureTicket ? (
	                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
	                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Técnico Asignado</label>
	                  <ResponsibleSelector
	                    users={assignableUsers}
                    selectedIds={form.responsibleUserIds}
                    onViewProfile={setViewingUserProfile}
                    onChange={(responsibleUserIds) => {
                      const nextStatus = (form.status === 'NEW' || form.status === 'OPEN') && responsibleUserIds.length > 0 ? 'IN_PROGRESS' : form.status;
                      setForm({
                        ...form,
                        responsibleUserIds,
                        assignedToId: responsibleUserIds[0] || '',
                        secondaryAssignedToId: responsibleUserIds[1] || '',
                        status: nextStatus,
	                      });
	                    }}
	                  />
	                </div>
	                ) : null}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ color: '#002D62', fontWeight: 600, fontSize: '0.85rem' }}>Ubicación *</label>
                  <select 
                    value={form.locationId} 
                    onChange={(e) => setForm({...form, locationId: e.target.value})} 
                    disabled={isStandardUser(currentUser)}
                    required 
                    style={{ background: isStandardUser(currentUser) ? '#f1f5f9' : '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.45rem', fontSize: '0.9rem', cursor: isStandardUser(currentUser) ? 'not-allowed' : 'default' }}
                  >
                    <option value="">-----</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                
                {/* Accordions */}
                <div style={{ borderTop: '1px solid #ced4da', marginTop: '0.5rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div 
                    onClick={() => setAccParticipantes(!accParticipantes)}
                    style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      👥 Participantes 
                      <span style={{ background: '#002D62', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem' }}>{participantCount}</span>
                    </span>
                    <span style={{ transform: accParticipantes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>^</span>
                  </div>

                  {accParticipantes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '0.5rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: '#888' }}>Solicitante</span><br/>
                        <div style={{ padding: '0.2rem 0', background: 'transparent', border: 'none', borderRadius: '4px', marginTop: '0.2rem', color: '#002D62' }}>
                          <button 
                            type="button" 
                            className="btn-ghost" 
                            style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600, color: '#002D62', border: 'none', background: 'transparent', fontSize: '0.85rem' }}
                            onClick={() => {
                              const match = users.find(u => u.name === (selectedTicket.createdBy?.name || 'Administrador'));
                              if (match) setViewingUserProfile(match);
                            }}
                          >
                             👤 {selectedTicket.createdBy?.name || 'Administrador'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>Tecnico encargado</span><br/>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
                          {form.responsibleUserIds.length > 0 ? form.responsibleUserIds.map((userId) => {
                            const user = assignableUsers.find((candidate) => String(candidate.id) === String(userId));
                            return (
                              <div key={userId} style={{ padding: '0.2rem 0', background: 'transparent', border: 'none', borderRadius: '4px', color: '#002D62', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button 
                                  type="button" 
                                  className="btn-ghost" 
                                  style={{ padding: 0, height: 'auto', textAlign: 'left', fontWeight: 600, color: '#002D62', border: 'none', background: 'transparent', fontSize: '0.85rem' }}
                                  onClick={() => setViewingUserProfile(user)}
                                >
                                  👤 {user?.name || 'Responsable'}
                                </button>
                              </div>
                            );
                          }) : (
                            <div style={{ minHeight: '38px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px' }} />
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'none' }}>
                        <span style={{ color: '#888' }}>Asignado a</span><br/>
                        <div style={{ padding: '0', background: '#f0f2f5', borderRadius: '4px', marginTop: '0.2rem', color: '#333', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                          <select 
                            value={form.assignedToId} 
                            onChange={(e) => setForm({...form, assignedToId: e.target.value})} 
                            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '0.3rem 0.5rem', cursor: 'pointer', fontWeight: 500, color: '#333' }}
                          >
                            <option value="">Sin Asignar</option>
                            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>Seguimiento</span><br/>
                        <div style={{ padding: '0', background: '#f0f2f5', borderRadius: '4px', marginTop: '0.2rem', color: '#333', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                          <span style={{ paddingLeft: '0.5rem', color: '#555' }}>T2</span>
                          <select
                            value={form.secondaryAssignedToId}
                            onChange={(e) => setForm({...form, secondaryAssignedToId: e.target.value})}
                            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '0.3rem 0.5rem', cursor: 'pointer', fontWeight: 500, color: '#333' }}
                          >
                            <option value="">Sin Asignar</option>
                            {assignableUsers.filter((u) => String(u.id) !== String(form.assignedToId)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      </div>
	                      {canConfigureTicket ? (
	                      <div>
	                        <span style={{ color: '#888' }}>Seguimiento</span><br/>
	                        <div style={{ marginTop: '0.2rem' }}>
	                          <SearchableSingleUserSelector
                            users={users}
                            value={form.observerId}
                            onChange={(observerId) => setForm({ ...form, observerId })}
	                            placeholder=""
	                          />
	                        </div>
	                      </div>
	                      ) : null}
                    </div>
                  )}

                </div>

              </div>

            </div>
          </form>
        </div>
      ) : (
        <>
          <section className="section-heading">
            <div>
              <h2>Tickets y gestion de incidentes</h2>
              <p>Registro, prioridad y seguimiento de solicitudes de soporte.</p>
            </div>
            <div className="toolbar" style={{ gap: '0.8rem' }}>
              <div className="inventory-actions-group" style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <button 
                  className="inventory-action-btn"
                  onClick={() => downloadTickets('excel')}
                  style={{ border: 'none', background: 'transparent', padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#1D6F42' }}
                >
                  <i className="fas fa-file-excel"></i>
                  <span>Excel Estructurado</span>
                </button>
                <button 
                  className="inventory-action-btn"
                  onClick={() => downloadTickets('pdf')}
                  style={{ border: 'none', background: 'transparent', padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#E02424', borderLeft: '1px solid #eee' }}
                >
                  <i className="fas fa-file-pdf"></i>
                  <span>Reporte PDF</span>
                </button>
              </div>
            </div>
          </section>

          {error && <div className="feedback error" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>{error}</div>}
          {feedback && <div className="feedback" style={{ marginBottom: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>{feedback}</div>}

          {/* Tablero de Estadísticas Premium */}
          {canViewStats && (
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Total', count: tickets.length, color: '#f8fafc', textColor: '#0f172a', borderColor: '#94a3b8', icon: 'fa-clipboard-list' },
              { id: 'NEW', label: 'Nuevos', count: tickets.filter(t => t.status === 'NEW').length, color: '#fef3c7', textColor: '#92400e', borderColor: '#f59e0b', icon: 'fa-ticket-alt' },
              { id: 'IN_PROGRESS', label: 'En Progreso', count: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN').length, color: '#e0f2fe', textColor: '#075985', borderColor: '#0ea5e9', icon: 'fa-spinner' },
              { id: 'RESOLVED', label: 'Resueltos', count: tickets.filter(t => t.status === 'RESOLVED').length, color: '#dcfce7', textColor: '#166534', borderColor: '#22c55e', icon: 'fa-check-circle' },
              { id: 'UNRESOLVED', label: 'No Resueltos', count: tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length, color: '#f3f4f6', textColor: '#374151', borderColor: '#9ca3af', icon: 'fa-exclamation-circle' },
              { id: 'OVERDUE', label: 'Vencidos', count: tickets.filter(t => getSlaInfo(t.createdAt, t.sla, t.resolvedAt || t.closedAt, t.status).isOverdue).length, color: '#fee2e2', textColor: '#991b1b', borderColor: '#ef4444', icon: 'fa-clock' },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                onClick={() => setDashboardFilter(dashboardFilter === stat.id ? 'ALL' : stat.id)}
                title={`Filtrar por ${stat.label}`}
                style={{ 
                flex: '1', 
                minWidth: '160px', 
                background: stat.color, 
                padding: '1.2rem 1rem', 
                borderRadius: '15px', 
                border: `2px solid ${dashboardFilter === stat.id ? stat.textColor : stat.borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: dashboardFilter === stat.id ? `0 0 0 3px ${stat.color}, 0 4px 12px rgba(0, 0, 0, 0.1)` : '0 4px 12px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transform: dashboardFilter === stat.id ? 'scale(1.03)' : 'none',
                transition: 'all 0.2s ease-in-out'
              }}>
                <i className={`fas ${stat.icon}`} style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '3rem', opacity: 0.1, color: stat.textColor }}></i>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: stat.textColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</span>
                <span style={{ fontSize: '2.2rem', fontWeight: '900', color: stat.textColor, marginTop: '0.3rem', lineHeight: 1 }}>{stat.count}</span>
              </div>
            ))}
          </div>
          )}

          <style>{`
            .responsive-split-card {
              display: flex;
              flex-wrap: wrap;
              gap: 2rem;
            }
            .responsive-list {
              flex: 1 1 500px;
              min-width: 0;
            }
            .responsive-form {
              flex: 1 1 350px;
              min-width: 0;
            }
            .mobile-toggle-btn {
              display: none;
            }
            .mobile-only-close-btn {
              display: none !important;
            }
            .responsive-filters {
              display: grid;
              grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
              gap: 0.75rem;
              background: transparent;
            }
            .responsive-filters > div {
              display: flex;
              flex-direction: column;
              gap: 0.2rem;
            }
            .responsive-filters label {
              font-size: 0.75rem;
              font-weight: 600;
              color: #475569;
            }
            .responsive-filters input {
              padding: 0.4rem 0.6rem;
              font-size: 0.85rem;
              height: 36px;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
            }
            @media (max-width: 900px) {
              .responsive-filters {
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
              }
              .responsive-filters > div:first-child {
                grid-column: 1 / -1;
              }
              .responsive-filters input {
                height: 32px;
                font-size: 0.8rem;
              }
              .responsive-form {
                display: none;
              }
              .responsive-form.show {
                display: flex;
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 2000;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                align-items: center;
                justify-content: center;
                padding: 1rem;
              }
              .responsive-form.show .form-container {
                width: 100%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
                background: #ffffff;
                padding: 1.5rem;
                border-radius: 20px;
                box-shadow: 0 24px 48px rgba(0,0,0,0.2);
              }
              .mobile-toggle-btn {
                display: inline-flex;
              }
              .mobile-only-close-btn {
                display: block !important;
              }
              .inventory-toolbar-filters {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <section className="responsive-split-card">
            <article className="card tickets-list-card responsive-list">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Tickets recientes</h3>
                <button 
                  className="primary mobile-toggle-btn" 
                  onClick={() => setShowMobileForm(!showMobileForm)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '8px' }}
                >
                  <i className={`fas ${showMobileForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '6px' }}></i>
                  {showMobileForm ? 'Cerrar Formulario' : 'Nuevo Ticket'}
                </button>
              </div>

              <div className="inventory-toolbar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="field full responsive-filters">
                  <div>
                    <label htmlFor="ticket-search">Busqueda</label>
                    <input
                      id="ticket-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Escribe para filtrar tickets..."
                    />
                  </div>
                  <div>
                    <label htmlFor="ticket-date-start">Desde</label>
                    <input
                      type="date"
                      id="ticket-date-start"
                      value={startDateFilter}
                      onChange={(event) => setStartDateFilter(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ticket-date-end">Hasta</label>
                    <input
                      type="date"
                      id="ticket-date-end"
                      value={endDateFilter}
                      onChange={(event) => setEndDateFilter(event.target.value)}
                    />
                  </div>
                </div>
                
                <div className="inventory-toolbar-filters">
                  <div className="field">
                    <label htmlFor="ticket-location-filter">Ubicacion</label>
                    <select id="ticket-location-filter" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                      <option value="ALL">----</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ticket-status-filter">Estado</label>
                    <select id="ticket-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option value="ALL">----</option>
                      <option value="NEW">Nuevo</option>
                      <option value="IN_PROGRESS">En Progreso</option>
                      <option value="SCHEDULED">Programado</option>
                      <option value="RESOLVED">Resuelto</option>
                      <option value="CLOSED">Cerrado</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ticket-category-filter">Categoria</label>
                    <select id="ticket-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                      <option value="ALL">----</option>
                      {[...new Set(categoriesConfig.map(c => c.name))].sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="table-shell tickets-table-scroll" style={{ marginTop: '1rem' }}>
                {filteredTickets.length === 0 ? (
                  <div className="empty-state">No se encontraron tickets registrados que coincidan con la vista.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Titulo</th>
                        <th className="col-hide-mobile">Usuario</th>
                        <th className="col-hide-mobile">Ubicación</th>
                        <th>ANS</th>
                        <th className="col-hide-mobile">Técnico Asignado</th>
                        <th>Estado</th>
                        <th className="col-hide-mobile">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} onClick={() => handleSelectTicket(ticket)} style={{cursor: 'pointer', transition: 'background 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td>{ticket.id}</td>
                          <td>
                            <strong>{ticket.title}</strong>
                            <div className="muted-text">{stripHtml(ticket.description)}</div>
                          </td>
                          <td className="col-hide-mobile">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              <AvatarThumb
                                name={ticket.createdBy?.name || 'Administrador'}
                                avatarUrl={ticket.createdBy?.avatarUrl}
                                borderColor="#d6dde6"
                              />
                              <span>{ticket.createdBy?.name || 'Administrador'}</span>
                            </div>
                          </td>
                          <td className="col-hide-mobile">{ticket.location?.name || 'No aplica'}</td>
                          <td>
                            <SlaProgressBar createdAt={ticket.createdAt} sla={ticket.sla} resolvedAt={ticket.resolvedAt || ticket.closedAt} status={ticket.status} />
                          </td>
                          <td className="col-hide-mobile">
                            {(() => {
                              const rIds = getResponsibleUserIds(ticket);
                              if (rIds.length === 0) {
                                return <span style={{ color: '#999', fontWeight: 600, fontSize: '0.85rem' }}>Sin Asignar</span>;
                              }
                              const techs = rIds.map(id => users.find(u => String(u.id) === String(id))).filter(Boolean);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  {techs.map((tech, i) => (
                                    <span key={i} style={{ color: '#1a437e', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                      {tech.name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <span className={`badge ${getStatusClass(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                          </td>
                          <td className="col-hide-mobile">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </article>

            <aside className={`responsive-form ${showMobileForm ? 'show' : ''}`}>
              <div className="card form-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0 }}>{form.id ? `Editar Ticket #${form.id}` : 'Crear Nuevo Ticket'}</h3>
                  <button 
                    type="button" 
                    className="mobile-only-close-btn"
                    onClick={() => setShowMobileForm(false)}
                    style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                  >&times;</button>
                </div>
                <form style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }} onSubmit={handleSubmit}>
                <div className="field full" style={{ gap: '0.2rem' }}>
                  <label htmlFor="ticket-type" style={{ color: '#002D62', fontWeight: 500 }}>Tipo</label>
                  <select id="ticket-type" value={form.ticketType} onChange={(e) => setForm({...form, ticketType: e.target.value, category: ''})} style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '3px', padding: '0.4rem 0.6rem' }}>
                    <option value="Incidencia">Incidencia</option>
                    <option value="Solicitud">Solicitud</option>
                  </select>
                </div>
                
                <div className="field full" style={{ gap: '0.2rem' }}>
                  <label htmlFor="ticket-category" style={{ color: '#002D62', fontWeight: 500 }}>Categoría <span style={{color: 'red'}}>*</span></label>
                  <CategorySelector 
                    categoriesConfig={categoriesConfig}
                    ticketType={form.ticketType}
                    value={form.category}
                    required={true}
                    onChange={(selectedCat) => {
                      setForm({...form, category: selectedCat.name, sla: selectedCat.sla || form.sla});
                    }}
                  />
                </div>

                <div className="field full" style={{ gap: '0.2rem' }}>
                  <label htmlFor="ticket-asset-new" style={{ color: '#002D62', fontWeight: 500 }}>Elementos asociados</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                    <div style={{ display: 'grid', placeItems: 'center', padding: '0 0.2rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <input id="ticket-asset-new" list="asset-datalist" placeholder="" style={{ flex: 1, border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, padding: '0.4rem 0.2rem', background: 'transparent', outline: 'none', fontSize: '1rem' }} onChange={(e) => {
                      const selected = assets.find(a => a.hostname === e.target.value);
                      setForm({...form, assetId: selected ? selected.id : ''});
                    }}/>
                    <datalist id="asset-datalist">
                      {assets.map((a) => <option key={a.id} value={a.hostname} />)}
                    </datalist>
                  </div>
                </div>

                <div className="field full" style={{ gap: '0.2rem' }}>
                  <label htmlFor="ticket-location" style={{ color: '#002D62', fontWeight: 500 }}>Ubicación <span style={{color: 'red'}}>*</span></label>
                  <select id="ticket-location" value={form.locationId} onChange={(e) => setForm({...form, locationId: e.target.value})} required style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '3px', padding: '0.4rem 0.6rem', width: '100%' }}>
                    <option value="">-----</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="field full" style={{ gap: '0.2rem' }}>
                  <label htmlFor="ticket-title" style={{ color: '#002D62', fontWeight: 500 }}>Título <span style={{color: 'red'}}>*</span></label>
                  <input 
                    id="ticket-title" 
                    required 
                    value={form.title} 
                    onChange={(e) => setForm({...form, title: e.target.value.toUpperCase()})} 
                    style={{ 
                      background: '#fff', 
                      border: '1px solid #ccc', 
                      borderRadius: '3px', 
                      padding: '0.4rem 0.6rem',
                      textTransform: 'uppercase'
                    }} 
                  />
                </div>

                <div className="field full" style={{ gap: '0.2rem', marginBottom: '2rem' }}>
                  <label style={{ color: '#002D62', fontWeight: 500 }}>Descripción <span style={{color: 'red'}}>*</span></label>
                  <RichTextEditor value={form.description} onChange={(val) => setForm({...form, description: val})} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button type="submit" disabled={saving} style={{ background: '#f4c33d', color: '#000', border: 'none', padding: '0.7rem 2.5rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {saving ? 'Enviando...' : '+ Enviar ticket'}
                  </button>
                </div>
              </form>
             </div>
            </aside>
          </section>
        </>
      )}
      {viewingUserProfile && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', padding: '1.5rem', zIndex: 1100 }}>
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#002D62' }}>Detalles de Usuario</h3>
                <p className="muted-text">Información de contacto oficial.</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setViewingUserProfile(null)}>&times;</button>
            </div>
            
            <div className="user-profile-details" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Nombre Completo</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.name}</strong>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Dependencia / Ubicación</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.location?.name || 'No registrada'}</strong>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Correo Electrónico</span>
                  <a href={`mailto:${viewingUserProfile.email}`} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>{viewingUserProfile.email}</a>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Teléfono / Celular</span>
                  <strong style={{ color: '#0f172a' }}>{viewingUserProfile.phone || 'No registrado'}</strong>
               </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
               <button type="button" className="btn" onClick={() => setViewingUserProfile(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



