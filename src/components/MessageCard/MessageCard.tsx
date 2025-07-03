import React from 'react';
import './MessageCard.css';

export interface MessageCardProps {
  id: string;
  message: string;
}

export const MessageCard: React.FC<MessageCardProps> = ({ id, message }) => (
  <div className="message-card">
    <div className="message-card__label">ID {id}</div>
    <div className="message-card__body">{message}</div>
  </div>
);
