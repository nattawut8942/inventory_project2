import { createPortal } from 'react-dom';

/**
 * Portal component that renders children directly to document body
 * This ensures fixed positioning works correctly regardless of parent containers
 */
const Portal = ({ children }) => {
    return createPortal(children, document.body);
};

export default Portal;
