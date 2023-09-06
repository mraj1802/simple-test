import {useState, useEffect, useCallback} from "react";
import {useWeb3React} from "@web3-react/core";
import {
    Button,
    Box,
    Text,
    Input,
    Switch,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
} from "@chakra-ui/react";
import {useDisclosure, useToast} from "@chakra-ui/react";
import abi from "./abi.json";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum: any;
    }
}

export default function ConnectButton() {
    const {account, active, activate, library, deactivate} = useWeb3React();
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [connected, setConnected] = useState<boolean>(false);
    const [balance, setBalance] = useState<string>("0");
    const [babyBalance, setBabyBalance] = useState<string>("0");
    const [mode, setMode] = useState<string>("BNB");
    const [recieverAdd, setRecieverAdd] = useState<string>("");
    const [sendAmount, setSendAmount] = useState<number>(0);
    const [gasFee, setGasFee] = useState<string>("");
    const [gasLimit, setGasLimit] = useState<number>(0);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [userAddress, setUserAddress]=useState("");
    const [bnbBalance, setBnbBalance] = useState('0');
    const [babyDoge, setBabyDoge] = useState('0');
    const [ethBalance, setEthBalance] = useState("");
    const [tokenBalance, setTokenBalance] = useState("");
    const toast = useToast();

    const ContractAddress = "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce"; // shiba inu

    // Assuming that MetaMask injected as the Ethereum provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    function handleMode() {
        setMode(mode === "BNB" ? "BabyDoge" : "BNB");
    }

    function handleChangeAddress(event: any) {
        setRecieverAdd(event.target.value);
    }

    function handleChangeAmount(event: any) {
        setSendAmount(event.target.value);
    }

    async function handleOpenModal() {
        if (!recieverAdd) {
            return toast({
                description: "Please input Receiver Address",
                status: "error",
            });
        }
        if (!sendAmount || sendAmount === 0) {
            return toast({
                description: "Please input send amount",
                status: "error",
            });
        }
        await window.ethereum.enable(); // Request user permission to access their MetaMask account
        const block = await provider.getBlock('latest');
        const gasLimit = block.gasLimit.toNumber();
        setGasLimit(gasLimit);
        const gasPrice = await provider.getGasPrice();
        setGasFee(ethers.utils.formatUnits(gasPrice, 'gwei'));
        onOpen();
    }

    const sendBaby = useCallback(async () => {
        if (typeof window.ethereum === 'undefined') {
            return toast({
                description: "Please install Metamask to continue",
                status: "error",
            });
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contractAddress = "0xc748673057861a797275CD8A068AbB95A902e8de";
        const contract = new ethers.Contract(contractAddress, abi, signer);
        try {
            const approvalTx = await contract.approve(account, sendAmount);
            await approvalTx.wait();
            const transferTx = await contract.transfer(recieverAdd, sendAmount);
            await transferTx.wait();
        } catch (e) {
            console.error(e);
        }
    }, [account]);

    //Sending the transaction using ether.js
    const sendAction = useCallback(async () => {
        try {
            const fromAddress = userAddress;
            const toAddress = ethers.utils.getAddress(recieverAdd);
            console.log({ fromAddress, toAddress });

            // return;

            const valueInWei = ethers.utils.parseEther(sendAmount.toString());
            const valueAsString = ethers.utils.formatUnits(valueInWei, 'wei').toString(); // Convert to string
            // const valueAsPromise = Promise.resolve(valueAsString);
            const txParams = [{
                from: fromAddress,
                to: toAddress,
                value: valueAsString
            }];
            console.log(txParams);
            const tx = await provider.send('eth_sendTransaction', txParams)
            const txReceipt = await provider.waitForTransaction(tx.hash);
            console.log("TransactionHash is:", txReceipt.transactionHash);

            onClose();
            valueload(userAddress);
        } catch (e) {
            console.error(e)
        }
    }, [account, library, recieverAdd, sendAmount, valueload, onClose]);

    function fromWei(val: string): string {
        if (val) {
            return ethers.utils.formatUnits(val, 'ether');
        } else {
            return '0';
        }
    }
    function toGWei(val: string): string {
        if (val) {
            return ethers.utils.formatUnits(val, 'gwei');
        } else {
            return '0';
        }
    }

    //Fetching the balance of an account
    async function valueload(account: string | undefined) {
        try {
            if (account) {
                // const provider = new ethers.providers.Web3Provider(library.provider);
                const balance = await provider.getBalance(userAddress);
                const gasPrice = await provider.getGasPrice();
                const balanceInEther = ethers.utils.formatUnits(balance, 'ether');
                const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
                return {
                    balance: balanceInEther,
                    gasPrice: gasPriceInGwei,
                };
            }
        } catch (error) {
            console.error(error);
        }
        return {
            balance: '0',
            gasPrice: '0',
        };
    }
    // Connecting the wallet
    const handleConnectWallet = async () => {
        console.log("entered in connectWallet function here");

        if (typeof window.ethereum !== 'undefined') {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log("if condition run");
            // setEthProvider(provider);
            const requestAccounts = async () => {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                } catch (error) {
                    console.error('Error requesting accounts:', error);
                }
            };
            requestAccounts();
            console.log("requestAccounts", requestAccounts);
            const signer = provider.getSigner();
            console.log("signer is", signer);
            const userAddress = await signer.getAddress();
            console.log("userAddress is", userAddress);
            await fetchBalances(userAddress, signer);
            localStorage.setItem('isWalletConnected', 'true');
            localStorage.setItem('userAddress', userAddress);
            console.log("in fetchBalance1");
            setUserAddress(userAddress);
            console.log( "Connected wallet address", userAddress);
            setIsWalletConnected(true);
        } else {
            console.error("Please install Metamask to continue");
        }
    }

    //Fetching the balance of tokens
    const fetchBalances = async (userAddress: string, signer: ethers.Signer) => {
        // Fetch ETH balance
        console.log("in fetchBalance")
        const ethBalance = await signer.getBalance();
        const formattedEthBalance = ethers.utils.formatEther(ethBalance);
        setEthBalance(formattedEthBalance);
        const testNetProvider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/'); // BSC Testnet
        const bnbBalance = await testNetProvider.getBalance(userAddress);
        const formattedBnbBalance = ethers.utils.formatEther(bnbBalance);
        setBnbBalance(formattedBnbBalance);
    };

    // Disconnecting the wallet
    const handleDisconnectWallet = () => {
        localStorage.removeItem('isWalletConnected');
        localStorage.removeItem('userAddress');
        setIsWalletConnected(false);
        setUserAddress('');
    };

    useEffect(() => {
        if (active) {
            valueload(account ?? undefined);
        }
    }, [account, active, library]);

    useEffect(() => {
        // Check if wallet was previously connected
        const storedIsWalletConnected = localStorage.getItem('isWalletConnected');
        const storedUserAddress = localStorage.getItem('userAddress');

        if (storedIsWalletConnected === 'true' && storedUserAddress) {
            setUserAddress(storedUserAddress);
            setIsWalletConnected(true);
            // Fetch balances immediately when the component loads
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            fetchBalances(storedUserAddress, signer);
        }
    }, []);

    return (
        <>
            <h1 className="title">Metamask login demo from Enva Division</h1>
            {isWalletConnected ? (
                <Box
                    display="block"
                    alignItems="center"
                    background="white"
                    borderRadius="xl"
                    p="4"
                    width="300px"
                >
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb="2"
                    >
                        <Text color="#158DE8" fontWeight="medium">
                            Account:
                        </Text>
                        <Text color="#6A6A6A" fontWeight="medium">
                            {`${userAddress.slice(0, 6)}...${userAddress.slice(
                                userAddress.length - 4,
                                userAddress.length
                            )}`}
                        </Text>
                    </Box>
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb="2"
                    >
                        <Text color="#158DE8" fontWeight="medium">
                            BabyDoge Balance :
                        </Text>
                        <Text color="#6A6A6A" fontWeight="medium">
                            { tokenBalance }
                        </Text>
                    </Box>
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb="2"
                    >
                        <Text color="#158DE8" fontWeight="medium">
                            BNB Balance :
                        </Text>
                        <Text color="#6A6A6A" fontWeight="medium">
                            {bnbBalance.slice(0, 9)}
                        </Text>
                    </Box>
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb="2"
                    >
                        <Text color="#158DE8" fontWeight="medium">
                            BNB / BabyDoge
                        </Text>
                        <Switch size="md" value={mode} onChange={handleMode}/>
                    </Box>
                    <Box
                        display="block"
                        justifyContent="space-between"
                        alignItems="center"
                        mb="4"
                    >
                        <Text color="#158DE8" fontWeight="medium">
                            Send {mode}:
                        </Text>
                        <Input
                            bg="#EBEBEB"
                            size="lg"
                            value={recieverAdd}
                            onChange={handleChangeAddress}
                        />
                    </Box>
                    <Box display="flex" alignItems="center" mb="4">
                        <Input
                            bg="#EBEBEB"
                            size="lg"
                            value={sendAmount}
                            onChange={handleChangeAmount}
                        />
                        <Button
                            onClick={handleOpenModal}
                            bg="#158DE8"
                            color="white"
                            fontWeight="medium"
                            borderRadius="xl"
                            ml="2"
                            border="1px solid transparent"
                            _hover={{
                                borderColor: "blue.700",
                                color: "gray.800",
                            }}
                            _active={{
                                backgroundColor: "blue.800",
                                borderColor: "blue.700",
                            }}
                        >
                            Send
                        </Button>
                    </Box>
                    <Box display="flex" justifyContent="center" alignItems="center">
                        <Button
                            onClick={handleDisconnectWallet}
                            bg="#158DE8"
                            color="white"
                            fontWeight="medium"
                            borderRadius="xl"
                            border="1px solid transparent"
                            width="300px"
                            _hover={{
                                borderColor: "blue.700",
                                color: "gray.800",
                            }}
                            _active={{
                                backgroundColor: "blue.800",
                                borderColor: "blue.700",
                            }}
                        >
                            Disconnect Wallet
                        </Button>
                    </Box>
                    <Modal isOpen={isOpen} onClose={onClose}>
                        <ModalOverlay/>
                        <ModalContent>
                            <ModalHeader>Are you Sure?</ModalHeader>
                            <ModalCloseButton/>
                            <ModalBody>
                                <div>
                                    Are you sure {sendAmount} {mode} to {recieverAdd} user?
                                </div>
                                <div>Gas Limit: {gasLimit}</div>
                                <div>Gas Price: {gasFee}</div>
                            </ModalBody>
                            <ModalFooter>
                                <Button colorScheme="blue" mr={3} onClick={onClose}>
                                    Close
                                </Button>
                                <Button variant="ghost" onClick={sendAction}>
                                    Send
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                </Box>
            ) : (
                // safe code here
                <Box bg="white" p="4" borderRadius="xl">
                    <Button
                        onClick={handleConnectWallet}
                        bg="#158DE8"
                        color="white"
                        fontWeight="medium"
                        borderRadius="xl"
                        border="1px solid transparent"
                        width="300px"
                        _hover={{
                            borderColor: "blue.700",
                            color: "gray.800",
                        }}
                        _active={{
                            backgroundColor: "blue.800",
                            borderColor: "blue.700",
                        }}
                    >
                        Connect Wallet
                    </Button>
                </Box>
            )}
        </>
    );
}