import React from 'react';

type Props = {
  onClick?: () => void;
};

const CommentButton: React.FC<Props> = ({ onClick }) => {
  return (
    <div className="group relative" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClick} className="cursor-pointer w-full h-full flex items-center justify-center">
        <svg
          strokeLinejoin="round"
          strokeLinecap="round"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          height={30}
          width={30}
          xmlns="http://www.w3.org/2000/svg"
          className="hover:scale-110 duration-200 hover:stroke-blue-500 text-gray-700"
          fill="none"
        >
          <path fill="none" d="M0 0h24v24H0z" stroke="none" />
          <path d="M8 9h8" />
          <path d="M8 13h6" />
          <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
        </svg>
      </button>
      <span className="absolute -top-10 left-[50%] -translate-x-[50%] z-20 origin-left scale-0 px-3 rounded-lg border border-gray-300 bg-white py-2 text-sm font-bold shadow-md transition-all duration-300 ease-in-out group-hover:scale-100 whitespace-nowrap">
        Comment
      </span>
    </div>
  );
}

export default CommentButton;
