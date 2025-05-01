// Cloudinary configuration (HANYA DI SINI)
const cloudinaryConfig = {
    cloudName: 'dhodn2m6x',
    uploadPreset: 'modulku_upload',
    folder: 'modules'
};

// Upload module to Cloudinary
async function uploadToCloudinary(file, resourceType = 'auto') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', cloudinaryConfig.folder);

        let endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`;
        if (resourceType === 'raw') {
            endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/raw/upload`;
        } else if (resourceType === 'image') {
            endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}

// Handle module upload
async function handleModuleUpload(title, description, category, pdfFile, thumbnailFile) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not logged in');
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists || !userDoc.data().isApproved || !userDoc.data().canUpload) {
            throw new Error('User not authorized to upload');
        }

        // Upload PDF as RAW (agar bisa diakses publik)
        const pdfUpload = await uploadToCloudinary(pdfFile, 'raw');
        let thumbnailUrl = '';
        if (thumbnailFile) {
            const thumbnailUpload = await uploadToCloudinary(thumbnailFile, 'image');
            thumbnailUrl = thumbnailUpload.secure_url;
        }

        const moduleData = {
            title: title,
            description: description,
            category: category,
            pdfUrl: pdfUpload.secure_url,
            thumbnailUrl: thumbnailUrl,
            uploadedBy: user.uid,
            uploadedByName: userDoc.data().name || user.displayName || '',
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isApproved: false,
            downloadCount: 0
        };

        await firebase.firestore().collection('modules').add(moduleData);

        return true;
    } catch (error) {
        console.error("Error handling module upload:", error);
        throw error;
    }
}