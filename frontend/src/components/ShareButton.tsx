import React from 'react';
import styled from 'styled-components';

interface ShareButtonProps {
  onClick: () => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({ onClick }) => {
  return (
    <StyledWrapper>
      <button className="main-button" onClick={onClick} title="Compartir ruta">
        <svg width={30} height={30} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.75 5.125a3.125 3.125 0 1 1 .754 2.035l-8.397 3.9a3.124 3.124 0 0 1 0 1.88l8.397 3.9a3.125 3.125 0 1 1-.61 1.095l-8.397-3.9a3.125 3.125 0 1 1 0-4.07l8.397-3.9a3.125 3.125 0 0 1-.144-.94Z" />
        </svg>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Adapted from user's snippet, keeping only the main button style */
  .main-button {
    position: relative;
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 50%;
    transition: 0.2s;
    cursor: pointer;
    color: #4b5563; /* text-gray-600 equivalent for the icon */
    margin: 0;
    appearance: none;
    outline: none;
  }

  .main-button:hover {
    transform: scale(1.1);
    background: transparent;
    color: #111827;
  }
  
  .main-button:active {
    box-shadow: none;
    transform: scale(0.95);
  }
`;

export default ShareButton;
