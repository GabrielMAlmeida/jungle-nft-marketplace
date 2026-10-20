export type NFT={id:string;name:string;creator:string;collection:string;category:'Art'|'Gaming'|'Photography'|'Music';priceEth:string;stock:number;image:string;description:string;edition:string;featured?:boolean;version:number};
export type User={id:string;name:string;email:string};
export type CartLine={nftId:string;quantity:number};
export type Cart={items:CartLine[]};
export type Quote={subtotalEth:string;discountEth:string;feeEth:string;totalEth:string;coupon:string|null};
export type Order={id:string;status:'pending'|'confirmed'|'rejected';version?:number;items:{nftId:string;name:string;quantity:number;unitPriceEth:string;image?:string}[];quote:Quote;createdAt:string;transactionId?:string;paymentMethod?:string;network?:string;outcome?:'confirmed'|'rejected';failureReason?:string};
export type NftList={items:NFT[];total:number;page:number;pages:number};

export type CollectorProfile={name:string;email:string;username:string;ens:string;walletNickname:string;avatar:string|null};
export type CollectorWallet={id:string;label:string;alias:string;network:'Ethereum'|'Polygon'|'Solana';address:string;provider:'MetaMask'|'Coinbase Wallet'|'WalletConnect';primary:boolean;ens:string};
