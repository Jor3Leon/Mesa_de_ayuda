import { Link } from 'react-router-dom';

export function Icon({ name, size = 20, className = "", style = {} }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
    style
  };

  const icons = {
    tickets: <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M9 9h6M9 15h6" />,
    alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />,
    tasks: <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
    assets: <path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7 12h10M7 16h10" />,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    chart: <path d="M18 20V10M12 20V4M6 20v-6" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    priority: <path d="M12 2v20M2 12h20M5.07 5.07l13.86 13.86M18.93 5.07L5.07 18.93" />,
  };

  return (
    <svg {...common}>
      {icons[name] || icons.tickets}
    </svg>
  );
}

export function BentoCard({ title, value, footer, icon, className = "", children, onClick, style = {} }) {
  return (
    <div 
      className={`bento-item glass-card ${className} ${onClick ? 'clickable' : ''}`} 
      style={style}
      onClick={onClick}
    >
      <div className="bento-top">
        <div className="bento-title">
          <Icon name={icon} size={16} />
          {title}
        </div>
        {value !== undefined && <div className="bento-value">{value}</div>}
        {children}
      </div>
      {footer && <div className="bento-footer">{footer}</div>}
    </div>
  );
}
