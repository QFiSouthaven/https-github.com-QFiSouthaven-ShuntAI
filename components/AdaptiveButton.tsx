// components/AdaptiveButton.tsx
import React, { useState, useEffect } from 'react';
import { useAutonomous } from '../context/AutonomousContext';
// FIX: Corrected import to use the newly exported 'trackCustomEvent'.
import { trackCustomEvent } from '../services/telemetry';

interface AdaptiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({ id, children, onClick, ...rest }) => {
  const { activeDirectives, consumeDirective } = useAutonomous();
  const [buttonText, setButtonText] = useState<React.ReactNode>(children);
  const [buttonStyle, setButtonStyle] = useState<React.CSSProperties>({});
  const [isDisabled, setIsDisabled] = useState<boolean>(rest.disabled || false);

  useEffect(() => {
    const buttonDirectives = activeDirectives.filter(
      (d) => (d.type === 'OPTIMIZATION' || d.type === 'UI_RECONFIGURATION') && d.targetElementId === id
    );

    if (buttonDirectives.length > 0) {
      const latestDirective = buttonDirectives[0];
      console.log(`Button ${id}: Applying directive`, latestDirective);
      if (latestDirective.payload.newText) setButtonText(latestDirective.payload.newText);
      if (latestDirective.payload.newStyle) setButtonStyle((prev) => ({ ...prev, ...latestDirective.payload.newStyle }));
      if (typeof latestDirective.payload.disabled !== 'undefined') setIsDisabled(latestDirective.payload.disabled);
      consumeDirective(latestDirective.id);
      // FIX: Corrected the event type to be more specific.
      trackCustomEvent('button_optimization_applied', { context: { directiveId: latestDirective.id } });
    }
  }, [activeDirectives, id, consumeDirective]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackCustomEvent('click', {
      elementId: id,
      elementName: 'AdaptiveButton',
      elementType: 'button',
      context: {
        originalText: children?.toString().substring(0, 50),
        currentText: buttonText?.toString().substring(0, 50),
      },
    });
    onClick?.(e);
  };

  return (
    <button id={id} style={buttonStyle} onClick={handleClick} disabled={isDisabled} {...rest}>
      {buttonText}
    </button>
  );
};

export default AdaptiveButton;
