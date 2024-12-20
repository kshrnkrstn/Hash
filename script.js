const pad = (data, blockSize = 8) => {
    const paddingLength = blockSize - (data.length % blockSize);
    return new Uint8Array([...data, ...new Uint8Array(paddingLength).fill(paddingLength)]);
};

const unpad = (data) => {
    const paddingLength = data[data.length - 1];
    return data.slice(0, data.length - paddingLength);
};

const gostEncryptBlock = (block, key, substitutionBox) => {
    let left = (block[0] | (block[1] << 8) | (block[2] << 16) | (block[3] << 24)) >>> 0;
    let right = (block[4] | (block[5] << 8) | (block[6] << 16) | (block[7] << 24)) >>> 0;

    for (let i = 0; i < 32; i++) {
        const keyIndex = i < 24 ? i % 8 : 7 - (i % 8);
        let temp = (left + key[keyIndex]) >>> 0;
        temp = substitution(temp, substitutionBox);
        temp = ((temp << 11) | (temp >>> 21)) >>> 0;
        temp ^= right;

        if (i < 31) {
            right = left;
            left = temp;
        } else {
            right = temp;
        }
    }

    return new Uint8Array([
        left & 0xff, (left >>> 8) & 0xff, (left >>> 16) & 0xff, (left >>> 24) & 0xff,
        right & 0xff, (right >>> 8) & 0xff, (right >>> 16) & 0xff, (right >>> 24) & 0xff
    ]);
};

const substitution = (value, substitutionBox) => {
    let result = 0;
    for (let i = 0; i < 8; i++) {
        const nibble = (value >>> (4 * i)) & 0xf;
        result |= substitutionBox[i][nibble] << (4 * i);
    }
    return result >>> 0;
};

//РЕАЛИЗАЦИЯ ХЕШ ФУНКЦИИ
const gostHash = (message, key, substitutionBox) => {
    const blockSize = 8;
    let hPrev = new Uint8Array(blockSize).fill(0);
    const paddedMessage = pad(message, blockSize);

    for (let i = 0; i < paddedMessage.length; i += blockSize) {
        const mI = paddedMessage.slice(i, i + blockSize);
        const encrypted = gostEncryptBlock(mI, key, substitutionBox);
        hPrev = hPrev.map((byte, idx) => byte ^ encrypted[idx] ^ mI[idx]);
    }

    return hPrev;
};

const generateSubstitutionBox = () => {
    return [
        [4, 10, 9, 2, 13, 8, 0, 14, 6, 11, 1, 12, 7, 15, 5, 3],
        [14, 11, 4, 12, 6, 13, 15, 10, 2, 3, 8, 1, 0, 7, 5, 9],
        [5, 8, 1, 13, 10, 3, 4, 2, 14, 15, 12, 7, 6, 0, 9, 11],
        [7, 13, 10, 1, 0, 8, 9, 15, 14, 4, 6, 12, 11, 2, 5, 3],
        [6, 12, 7, 1, 5, 15, 13, 8, 4, 10, 9, 14, 0, 3, 11, 2],
        [4, 11, 10, 0, 7, 2, 1, 13, 3, 6, 8, 5, 9, 12, 15, 14],
        [13, 11, 4, 1, 3, 15, 5, 9, 0, 10, 14, 7, 6, 8, 2, 12],
        [1, 15, 13, 0, 5, 7, 10, 4, 9, 2, 3, 14, 6, 11, 8, 12],
    ];
};


const generateRandomKey = () => {
    const characters = '0123456789ABCDEF';
    let key = '';
    for (let i = 0; i < 32; i++) {
        key += characters[Math.floor(Math.random() * characters.length)];
    }
    return key;
};

const hexToBytes = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
};

document.getElementById('hashButton').addEventListener('click', () => {
    const message = new TextEncoder().encode(document.getElementById('message').value);
    let keyHex = document.getElementById('key').value;

    if (keyHex.length === 0) {
        keyHex = generateRandomKey();
        document.getElementById('key').value = keyHex;
    }

    if (keyHex.length !== 32) {
        alert('Ключ должен быть длиной 32 символа.');
        return;
    }

    const key = [];
    for (let i = 0; i < 32; i += 8) {
        key.push(
            (parseInt(keyHex.substr(i, 8), 16)) >>> 0
        );
    }

    const substitutionBox = generateSubstitutionBox();
    const hashResult = gostHash(message, key, substitutionBox);

    document.getElementById('hashResult').textContent = Array.from(hashResult)
        .map(byte => byte.toString(16).padStart(2, '0')).join('');
});

document.getElementById('generateKeyButton').addEventListener('click', () => {
    document.getElementById('key').value = generateRandomKey();
});