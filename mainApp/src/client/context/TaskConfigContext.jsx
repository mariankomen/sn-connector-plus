import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import axios from 'axios'

const TaskConfigContext = createContext()
const baseUrl = "/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio";

export function TaskConfigProvider({ isAuthenticated, children }) {
    const [availableTaskTypes, setAvailableTaskTypes] = useState([])
    const [selectedTaskTypes, setSelectedTaskTypes] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const hasLoadedRef = useRef(false)

    const fetchTaskData = useCallback(
        async (force = false) => {
            if (!isAuthenticated) {
                return
            }
            if (hasLoadedRef.current && !force) {
                return
            }

            setIsLoading(true)
            setError('')

            try {
                const headers = {
                    Accept: 'application/json',
                    'X-UserToken': window.g_ck
                }
                const [typesResponse, configResponse] = await Promise.all([
                    axios.get(`${baseUrl}/task-types`, { headers }),
                    axios.get(`${baseUrl}/task-type-config`, { headers })
                ])
                setAvailableTaskTypes(typesResponse.data.result.taskTypes || [])
                setSelectedTaskTypes(configResponse.data.result.task_types || [])
                hasLoadedRef.current = true
            } catch (err) {
                setError(err.response?.data?.error || err.message || 'Failed to load configuration')
            } finally {
                setIsLoading(false)
            }
        },
        [isAuthenticated]
    )

    useEffect(() => {
        if (!isAuthenticated) {
            setAvailableTaskTypes([])
            setSelectedTaskTypes([])
            setIsLoading(false)
            setError('')
            hasLoadedRef.current = false
            return
        }
        fetchTaskData()
    }, [isAuthenticated, fetchTaskData])

    const refreshTaskData = useCallback(() => fetchTaskData(true), [fetchTaskData])

    const saveTaskTypes = useCallback(async (taskTypes) => {
        try {
            await axios.put(
                `${baseUrl}/task-type-config`,
                { task_types: taskTypes },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-UserToken': window.g_ck
                    }
                }
            )
            setSelectedTaskTypes([...taskTypes])
            hasLoadedRef.current = true
            return { success: true }
        } catch (err) {
            const message = err.response?.data?.error || err.message || 'Failed to save configuration'
            return { success: false, error: message }
        }
    }, [])

    const value = {
        availableTaskTypes,
        selectedTaskTypes,
        isLoading,
        error,
        refreshTaskData,
        saveTaskTypes,
        setError
    }

    return <TaskConfigContext.Provider value={value}>{children}</TaskConfigContext.Provider>
}

export function useTaskConfig() {
    const context = useContext(TaskConfigContext)
    if (!context) {
        throw new Error('useTaskConfig must be used within a TaskConfigProvider')
    }
    return context
}

