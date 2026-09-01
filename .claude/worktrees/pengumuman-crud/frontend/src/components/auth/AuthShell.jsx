export default function AuthShell({
  left,
  title,
  subtitle,
  children,
  containerClassName = "auth-container",
  cardClassName = "auth-card",
  leftClassName = "auth-left",
  rightClassName = "auth-right",
  headerClassName = "auth-header",
}) {
  return (
    <div className={containerClassName}>
      <div className={cardClassName}>
        <div className={leftClassName}>{left}</div>

        <div className={rightClassName}>
          <div className={headerClassName}>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
