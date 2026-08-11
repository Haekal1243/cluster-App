export default function RegisterStepper({ activeStep }) {
  return (
    <div className="stepper-box">
      <div className={`step ${activeStep === 1 ? "active" : "inactive"}`}>
        <div className="step-dot" />
        <span className="step-label">Personal Data</span>
      </div>
      <div className="step-line" />
      <div className={`step ${activeStep === 2 ? "active" : "inactive"}`}>
        <div className="step-dot" />
        <span className="step-label">Account Info</span>
      </div>
    </div>
  );
}
